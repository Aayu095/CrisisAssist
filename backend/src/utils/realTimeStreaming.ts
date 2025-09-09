import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import WebSocket from 'ws';
import { logger } from './logger';
import { genkitMultiAgentFramework } from './genkitAgentFramework';
import { validateAgentToken } from './descope';

export interface StreamingMessage {
  id: string;
  type: 'agent_start' | 'agent_progress' | 'agent_complete' | 'workflow_complete' | 'error';
  agent: string;
  data: any;
  timestamp: Date;
}

export interface AgentStreamingContext {
  sessionId: string;
  userId: string;
  taskType: string;
  agents: string[];
  currentAgent?: string;
  startTime: Date;
  status: 'active' | 'completed' | 'failed';
}

export class RealTimeStreamingService {
  private io: SocketIOServer;
  private wss: WebSocket.Server;
  private activeSessions: Map<string, AgentStreamingContext>;
  private agentQueues: Map<string, any[]>;

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.IO for real-time communication
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.CORS_ORIGIN || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    // Initialize WebSocket server for agent-to-agent communication
    this.wss = new WebSocket.Server({ 
      port: parseInt(process.env.WS_PORT || '3002'),
      verifyClient: this.verifyWebSocketClient.bind(this)
    });

    this.activeSessions = new Map();
    this.agentQueues = new Map();

    this.setupSocketIOHandlers();
    this.setupWebSocketHandlers();
    this.initializeAgentQueues();

    logger.info('Real-time streaming service initialized', {
      socketIOPort: 'attached to HTTP server',
      webSocketPort: process.env.WS_PORT || '3002'
    });
  }

  private verifyWebSocketClient(info: any): boolean {
    // In production, verify JWT token from query params or headers
    const token = info.req.url?.split('token=')[1];
    if (!token && process.env.NODE_ENV === 'production') {
      return false;
    }
    return true;
  }

  private setupSocketIOHandlers() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token && process.env.NODE_ENV === 'production') {
          throw new Error('Authentication required');
        }

        // Validate Descope token
        if (token) {
          const validation = await validateAgentToken(token);
          if (!validation.valid) {
            throw new Error('Invalid token');
          }
          socket.data.user = validation.claims;
        }

        next();
      } catch (error) {
        logger.error('Socket authentication failed:', error);
        next(new Error('Authentication failed'));
      }
    });

    this.io.on('connection', (socket) => {
      logger.info('Client connected to real-time stream', { 
        socketId: socket.id,
        userId: socket.data.user?.sub 
      });

      socket.on('start_agent_workflow', async (data) => {
        await this.handleStartWorkflow(socket, data);
      });

      socket.on('agent_message', async (data) => {
        await this.handleAgentMessage(socket, data);
      });

      socket.on('subscribe_agent_updates', (agentId) => {
        socket.join(`agent_${agentId}`);
        logger.info('Client subscribed to agent updates', { 
          socketId: socket.id, 
          agentId 
        });
      });

      socket.on('disconnect', () => {
        logger.info('Client disconnected from real-time stream', { 
          socketId: socket.id 
        });
      });
    });
  }

  private setupWebSocketHandlers() {
    this.wss.on('connection', (ws, req) => {
      logger.info('Agent WebSocket connection established');

      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleAgentWebSocketMessage(ws, message);
        } catch (error) {
          logger.error('WebSocket message handling failed:', error);
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format'
          }));
        }
      });

      ws.on('close', () => {
        logger.info('Agent WebSocket connection closed');
      });

      // Send initial handshake
      ws.send(JSON.stringify({
        type: 'handshake',
        message: 'Connected to CrisisAssist agent network',
        timestamp: new Date().toISOString()
      }));
    });
  }

  private initializeAgentQueues() {
    const agents = ['alert_analyzer', 'content_verifier', 'message_enhancer', 'event_scheduler'];
    agents.forEach(agent => {
      this.agentQueues.set(agent, []);
    });
  }

  private async handleStartWorkflow(socket: any, data: any) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const context: AgentStreamingContext = {
        sessionId,
        userId: socket.data.user?.sub || 'anonymous',
        taskType: data.taskType,
        agents: data.agents || ['alert_analyzer'],
        startTime: new Date(),
        status: 'active'
      };

      this.activeSessions.set(sessionId, context);
      socket.join(sessionId);

      // Emit workflow start
      this.emitToSession(sessionId, {
        id: sessionId,
        type: 'agent_start',
        agent: 'coordinator',
        data: {
          message: 'Multi-agent workflow initiated',
          taskType: data.taskType,
          expectedAgents: context.agents
        },
        timestamp: new Date()
      });

      // Start agent framework execution with streaming
      this.executeWorkflowWithStreaming(sessionId, data.taskType, data.inputData);

    } catch (error) {
      logger.error('Failed to start agent workflow:', error);
      socket.emit('workflow_error', {
        sessionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async executeWorkflowWithStreaming(
    sessionId: string, 
    taskType: string, 
    inputData: any
  ) {
    const context = this.activeSessions.get(sessionId);
    if (!context) return;

    try {
      // Execute with progress streaming
      const result = await this.streamAgentExecution(sessionId, taskType, inputData);
      
      context.status = 'completed';
      this.activeSessions.set(sessionId, context);

      this.emitToSession(sessionId, {
        id: `${sessionId}_complete`,
        type: 'workflow_complete',
        agent: 'coordinator',
        data: {
          result,
          duration: Date.now() - context.startTime.getTime(),
          agentsUsed: context.agents
        },
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Workflow execution failed:', error);
      context.status = 'failed';
      this.activeSessions.set(sessionId, context);

      this.emitToSession(sessionId, {
        id: `${sessionId}_error`,
        type: 'error',
        agent: 'coordinator',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
          duration: Date.now() - context.startTime.getTime()
        },
        timestamp: new Date()
      });
    }
  }

  private async streamAgentExecution(
    sessionId: string, 
    taskType: string, 
    inputData: any
  ): Promise<any> {
    const context = this.activeSessions.get(sessionId);
    if (!context) throw new Error('Session not found');

    // Emit progress for each agent in the workflow
    for (const agentName of context.agents) {
      context.currentAgent = agentName;
      this.activeSessions.set(sessionId, context);

      this.emitToSession(sessionId, {
        id: `${sessionId}_${agentName}_start`,
        type: 'agent_start',
        agent: agentName,
        data: {
          message: `${agentName} processing started`,
          inputData: this.sanitizeDataForStreaming(inputData)
        },
        timestamp: new Date()
      });

      // Simulate agent processing with progress updates
      await this.simulateAgentProgress(sessionId, agentName);
    }

    // Execute actual framework
    const result = await genkitMultiAgentFramework.executeTask(
      taskType as any,
      inputData
    );

    return result;
  }

  private async simulateAgentProgress(sessionId: string, agentName: string) {
    const progressSteps = [
      'Initializing agent capabilities',
      'Processing input data',
      'Applying domain expertise',
      'Generating structured output',
      'Validating results'
    ];

    for (let i = 0; i < progressSteps.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 200)); // 200ms delay

      this.emitToSession(sessionId, {
        id: `${sessionId}_${agentName}_progress_${i}`,
        type: 'agent_progress',
        agent: agentName,
        data: {
          step: progressSteps[i],
          progress: ((i + 1) / progressSteps.length) * 100,
          timestamp: new Date().toISOString()
        },
        timestamp: new Date()
      });
    }

    this.emitToSession(sessionId, {
      id: `${sessionId}_${agentName}_complete`,
      type: 'agent_complete',
      agent: agentName,
      data: {
        message: `${agentName} processing completed`,
        status: 'success'
      },
      timestamp: new Date()
    });
  }

  private async handleAgentMessage(socket: any, data: any) {
    const { targetAgent, message, sessionId } = data;
    
    // Queue message for target agent
    const queue = this.agentQueues.get(targetAgent);
    if (queue) {
      queue.push({
        from: socket.data.user?.sub || 'anonymous',
        message,
        timestamp: new Date(),
        sessionId
      });

      // Notify agent via WebSocket
      this.broadcastToAgents({
        type: 'agent_message',
        targetAgent,
        message,
        sessionId
      });

      socket.emit('message_queued', {
        targetAgent,
        queuePosition: queue.length
      });
    }
  }

  private async handleAgentWebSocketMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'agent_register':
        logger.info('Agent registered via WebSocket', { agentId: message.agentId });
        break;

      case 'agent_status_update':
        this.broadcastAgentStatus(message.agentId, message.status);
        break;

      case 'agent_result':
        this.handleAgentResult(message);
        break;

      default:
        logger.warn('Unknown WebSocket message type:', message.type);
    }
  }

  private emitToSession(sessionId: string, message: StreamingMessage) {
    this.io.to(sessionId).emit('agent_update', message);
    logger.debug('Emitted to session', { sessionId, messageType: message.type });
  }

  private broadcastToAgents(message: any) {
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  private broadcastAgentStatus(agentId: string, status: any) {
    this.io.to(`agent_${agentId}`).emit('agent_status', {
      agentId,
      status,
      timestamp: new Date()
    });
  }

  private handleAgentResult(message: any) {
    const { sessionId, agentId, result } = message;
    
    this.emitToSession(sessionId, {
      id: `${sessionId}_${agentId}_result`,
      type: 'agent_complete',
      agent: agentId,
      data: result,
      timestamp: new Date()
    });
  }

  private sanitizeDataForStreaming(data: any): any {
    // Remove sensitive information before streaming
    if (typeof data === 'object' && data !== null) {
      const sanitized = { ...data };
      delete sanitized.password;
      delete sanitized.token;
      delete sanitized.secret;
      return sanitized;
    }
    return data;
  }

  /**
   * Get active streaming sessions
   */
  getActiveSessions(): AgentStreamingContext[] {
    return Array.from(this.activeSessions.values());
  }

  /**
   * Get agent queue status
   */
  getAgentQueueStatus(): Record<string, number> {
    const status: Record<string, number> = {};
    this.agentQueues.forEach((queue, agent) => {
      status[agent] = queue.length;
    });
    return status;
  }

  /**
   * Cleanup inactive sessions
   */
  cleanupSessions() {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes

    this.activeSessions.forEach((context, sessionId) => {
      if (now - context.startTime.getTime() > maxAge) {
        this.activeSessions.delete(sessionId);
        logger.info('Cleaned up inactive session', { sessionId });
      }
    });
  }
}

// Export for integration with main server
export let streamingService: RealTimeStreamingService;

export function initializeStreaming(httpServer: HTTPServer) {
  streamingService = new RealTimeStreamingService(httpServer);
  
  // Cleanup sessions every 10 minutes
  setInterval(() => {
    streamingService.cleanupSessions();
  }, 10 * 60 * 1000);

  return streamingService;
}
