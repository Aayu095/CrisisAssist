import { configureGenkit } from '@genkit-ai/core';
import { googleAI } from '@genkit-ai/googleai';
import { defineFlow, runFlow } from '@genkit-ai/flow';
import { generate } from '@genkit-ai/ai';
import { z } from 'zod';
import { EventEmitter } from 'events';
import logger from './logger';

// Configure Genkit with Google AI
configureGenkit({
  plugins: [googleAI()],
  logLevel: 'debug',
  enableTracingAndMetrics: true,
});

// Agent State Schema
const AgentStateSchema = z.object({
  messages: z.array(z.string()).default([]),
  current_agent: z.string().default(''),
  task_type: z.enum(['alert_analysis', 'content_verification', 'message_enhancement', 'event_scheduling']),
  input_data: z.record(z.any()).default({}),
  output_data: z.record(z.any()).default({}),
  processing_status: z.enum(['pending', 'processing', 'completed', 'error']).default('pending'),
  agent_results: z.record(z.any()).default({}),
  workflow_id: z.string().default(''),
  timestamp: z.number().default(() => Date.now()),
});

type AgentState = z.infer<typeof AgentStateSchema>;

// Agent Configuration
interface AgentConfig {
  name: string;
  description: string;
  capabilities: string[];
  model: string;
  temperature: number;
  maxTokens: number;
}

// Multi-Agent Framework Class
export class GenkitMultiAgentFramework extends EventEmitter {
  private agents: Map<string, AgentConfig> = new Map();
  private workflows: Map<string, any> = new Map();
  private isInitialized = false;

  constructor() {
    super();
    this.initializeAgents();
  }

  private initializeAgents() {
    // Alert Analyzer Agent
    this.agents.set('alert_analyzer', {
      name: 'Alert Analyzer',
      description: 'Analyzes emergency alerts and determines risk levels',
      capabilities: ['risk_assessment', 'resource_planning', 'impact_analysis'],
      model: 'gemini-1.5-flash',
      temperature: 0.3,
      maxTokens: 1000,
    });

    // Content Verifier Agent
    this.agents.set('content_verifier', {
      name: 'Content Verifier',
      description: 'Verifies content authenticity and prevents misinformation',
      capabilities: ['fact_checking', 'source_verification', 'credibility_scoring'],
      model: 'gemini-1.5-flash',
      temperature: 0.1,
      maxTokens: 800,
    });

    // Message Enhancer Agent
    this.agents.set('message_enhancer', {
      name: 'Message Enhancer',
      description: 'Enhances emergency messages for clarity and urgency',
      capabilities: ['message_optimization', 'tone_adjustment', 'clarity_improvement'],
      model: 'gemini-1.5-flash',
      temperature: 0.5,
      maxTokens: 600,
    });

    // Event Scheduler Agent
    this.agents.set('event_scheduler', {
      name: 'Event Scheduler',
      description: 'Schedules and coordinates emergency response events',
      capabilities: ['calendar_management', 'resource_coordination', 'timeline_optimization'],
      model: 'gemini-1.5-flash',
      temperature: 0.2,
      maxTokens: 800,
    });

    this.isInitialized = true;
    logger.info('Genkit Multi-Agent Framework initialized with 4 agents');
  }

  // Define Alert Analysis Flow
  private createAlertAnalysisFlow() {
    return defineFlow(
      {
        name: 'alertAnalysis',
        inputSchema: z.object({
          alert: z.record(z.any()),
          context: z.record(z.any()).optional(),
        }),
        outputSchema: z.object({
          risk_level: z.enum(['low', 'medium', 'high', 'critical']),
          affected_population: z.number(),
          required_resources: z.array(z.string()),
          recommended_actions: z.array(z.string()),
          confidence_score: z.number(),
        }),
      },
      async (input) => {
        const agent = this.agents.get('alert_analyzer')!;
        
        const prompt = `
You are an emergency alert analysis expert. Analyze the following alert and provide a structured response.

Alert Data: ${JSON.stringify(input.alert, null, 2)}
Context: ${JSON.stringify(input.context || {}, null, 2)}

Analyze this alert and respond with a JSON object containing:
- risk_level: "low", "medium", "high", or "critical"
- affected_population: estimated number of people affected
- required_resources: array of required resources
- recommended_actions: array of recommended immediate actions
- confidence_score: confidence in analysis (0-1)

Respond only with valid JSON.`;

        try {
          const result = await generate({
            model: agent.model,
            prompt,
            config: {
              temperature: agent.temperature,
              maxOutputTokens: agent.maxTokens,
            },
          });

          const analysis = JSON.parse(result.text());
          logger.info('Alert analysis completed', { analysis });
          return analysis;
        } catch (error) {
          logger.error('Alert analysis failed:', error);
          // Fallback analysis
          return {
            risk_level: 'medium' as const,
            affected_population: 100,
            required_resources: ['emergency_services', 'medical_support'],
            recommended_actions: ['assess_situation', 'notify_authorities'],
            confidence_score: 0.5,
          };
        }
      }
    );
  }

  // Define Content Verification Flow
  private createContentVerificationFlow() {
    return defineFlow(
      {
        name: 'contentVerification',
        inputSchema: z.object({
          content: z.string(),
          source: z.string().optional(),
          context: z.record(z.any()).optional(),
        }),
        outputSchema: z.object({
          is_verified: z.boolean(),
          credibility_score: z.number(),
          verification_notes: z.string(),
          risk_factors: z.array(z.string()),
          recommended_action: z.enum(['approve', 'flag', 'reject']),
        }),
      },
      async (input) => {
        const agent = this.agents.get('content_verifier')!;
        
        const prompt = `
You are a content verification expert specializing in emergency communications. Verify the following content.

Content: "${input.content}"
Source: ${input.source || 'Unknown'}
Context: ${JSON.stringify(input.context || {}, null, 2)}

Analyze this content and respond with a JSON object containing:
- is_verified: boolean indicating if content is verified
- credibility_score: score from 0-1 indicating credibility
- verification_notes: detailed notes about verification
- risk_factors: array of identified risk factors
- recommended_action: "approve", "flag", or "reject"

Respond only with valid JSON.`;

        try {
          const result = await generate({
            model: agent.model,
            prompt,
            config: {
              temperature: agent.temperature,
              maxOutputTokens: agent.maxTokens,
            },
          });

          const verification = JSON.parse(result.text());
          logger.info('Content verification completed', { verification });
          return verification;
        } catch (error) {
          logger.error('Content verification failed:', error);
          return {
            is_verified: false,
            credibility_score: 0.5,
            verification_notes: 'Verification failed due to technical error',
            risk_factors: ['technical_error'],
            recommended_action: 'flag' as const,
          };
        }
      }
    );
  }

  // Define Message Enhancement Flow
  private createMessageEnhancementFlow() {
    return defineFlow(
      {
        name: 'messageEnhancement',
        inputSchema: z.object({
          message: z.string(),
          target_audience: z.string().optional(),
          urgency_level: z.enum(['low', 'medium', 'high', 'critical']).optional(),
          context: z.record(z.any()).optional(),
        }),
        outputSchema: z.object({
          enhanced_message: z.string(),
          improvements_made: z.array(z.string()),
          tone_adjustments: z.array(z.string()),
          clarity_score: z.number(),
          urgency_indicators: z.array(z.string()),
        }),
      },
      async (input) => {
        const agent = this.agents.get('message_enhancer')!;
        
        const prompt = `
You are a communication expert specializing in emergency messaging. Enhance the following message.

Original Message: "${input.message}"
Target Audience: ${input.target_audience || 'General public'}
Urgency Level: ${input.urgency_level || 'medium'}
Context: ${JSON.stringify(input.context || {}, null, 2)}

Enhance this message and respond with a JSON object containing:
- enhanced_message: improved version of the message
- improvements_made: array of improvements made
- tone_adjustments: array of tone adjustments applied
- clarity_score: score from 0-1 indicating message clarity
- urgency_indicators: array of urgency indicators added

Respond only with valid JSON.`;

        try {
          const result = await generate({
            model: agent.model,
            prompt,
            config: {
              temperature: agent.temperature,
              maxOutputTokens: agent.maxTokens,
            },
          });

          const enhancement = JSON.parse(result.text());
          logger.info('Message enhancement completed', { enhancement });
          return enhancement;
        } catch (error) {
          logger.error('Message enhancement failed:', error);
          return {
            enhanced_message: input.message,
            improvements_made: ['fallback_applied'],
            tone_adjustments: ['none'],
            clarity_score: 0.7,
            urgency_indicators: ['ALERT'],
          };
        }
      }
    );
  }

  // Define Event Scheduling Flow
  private createEventSchedulingFlow() {
    return defineFlow(
      {
        name: 'eventScheduling',
        inputSchema: z.object({
          event_type: z.string(),
          priority: z.enum(['low', 'medium', 'high', 'critical']),
          required_resources: z.array(z.string()),
          context: z.record(z.any()).optional(),
        }),
        outputSchema: z.object({
          scheduled_events: z.array(z.object({
            title: z.string(),
            description: z.string(),
            start_time: z.string(),
            duration_minutes: z.number(),
            attendees: z.array(z.string()),
            resources: z.array(z.string()),
          })),
          coordination_plan: z.string(),
          timeline_optimization: z.array(z.string()),
          resource_allocation: z.record(z.any()),
        }),
      },
      async (input) => {
        const agent = this.agents.get('event_scheduler')!;
        
        const prompt = `
You are an emergency response coordination expert. Create a scheduling plan for the following event.

Event Type: ${input.event_type}
Priority: ${input.priority}
Required Resources: ${input.required_resources.join(', ')}
Context: ${JSON.stringify(input.context || {}, null, 2)}

Create a scheduling plan and respond with a JSON object containing:
- scheduled_events: array of events with title, description, start_time, duration_minutes, attendees, resources
- coordination_plan: detailed coordination plan
- timeline_optimization: array of timeline optimization suggestions
- resource_allocation: object mapping resources to allocations

Use ISO 8601 format for start_time. Respond only with valid JSON.`;

        try {
          const result = await generate({
            model: agent.model,
            prompt,
            config: {
              temperature: agent.temperature,
              maxOutputTokens: agent.maxTokens,
            },
          });

          const scheduling = JSON.parse(result.text());
          logger.info('Event scheduling completed', { scheduling });
          return scheduling;
        } catch (error) {
          logger.error('Event scheduling failed:', error);
          const now = new Date();
          return {
            scheduled_events: [{
              title: `Emergency Response: ${input.event_type}`,
              description: 'Emergency response event scheduled automatically',
              start_time: new Date(now.getTime() + 30 * 60000).toISOString(),
              duration_minutes: 60,
              attendees: ['emergency_coordinator'],
              resources: input.required_resources,
            }],
            coordination_plan: 'Standard emergency response protocol activated',
            timeline_optimization: ['immediate_response_required'],
            resource_allocation: {},
          };
        }
      }
    );
  }

  // Initialize all flows
  private initializeFlows() {
    this.workflows.set('alert_analysis', this.createAlertAnalysisFlow());
    this.workflows.set('content_verification', this.createContentVerificationFlow());
    this.workflows.set('message_enhancement', this.createMessageEnhancementFlow());
    this.workflows.set('event_scheduling', this.createEventSchedulingFlow());
    
    logger.info('All Genkit flows initialized');
  }

  // Execute a specific task
  async executeTask(taskType: string, inputData: any, context?: any): Promise<any> {
    if (!this.isInitialized) {
      throw new Error('Framework not initialized');
    }

    if (!this.workflows.has(taskType)) {
      this.initializeFlows();
    }

    const workflowId = `${taskType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.emit('task_started', { workflowId, taskType, inputData });
      logger.info(`Starting task: ${taskType}`, { workflowId });

      let result;
      const flow = this.workflows.get(taskType);

      switch (taskType) {
        case 'alert_analysis':
          result = await runFlow(flow, { alert: inputData, context });
          break;
        case 'content_verification':
          result = await runFlow(flow, { 
            content: inputData.content || inputData, 
            source: inputData.source,
            context 
          });
          break;
        case 'message_enhancement':
          result = await runFlow(flow, { 
            message: inputData.message || inputData,
            target_audience: inputData.target_audience,
            urgency_level: inputData.urgency_level,
            context 
          });
          break;
        case 'event_scheduling':
          result = await runFlow(flow, { 
            event_type: inputData.event_type || 'emergency_response',
            priority: inputData.priority || 'high',
            required_resources: inputData.required_resources || [],
            context 
          });
          break;
        default:
          throw new Error(`Unknown task type: ${taskType}`);
      }

      this.emit('task_completed', { workflowId, taskType, result });
      logger.info(`Task completed: ${taskType}`, { workflowId, result });
      
      return { [taskType.replace('_', '_')]: result };
    } catch (error) {
      this.emit('task_failed', { workflowId, taskType, error });
      logger.error(`Task failed: ${taskType}`, { workflowId, error });
      throw error;
    }
  }

  // Execute multi-agent workflow
  async executeWorkflow(tasks: Array<{ type: string; data: any; context?: any }>): Promise<any> {
    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results: any = {};

    try {
      this.emit('workflow_started', { workflowId, tasks });
      logger.info('Starting multi-agent workflow', { workflowId, taskCount: tasks.length });

      for (const task of tasks) {
        const taskResult = await this.executeTask(task.type, task.data, task.context);
        results[task.type] = taskResult[task.type.replace('_', '_')];
      }

      this.emit('workflow_completed', { workflowId, results });
      logger.info('Multi-agent workflow completed', { workflowId, results });
      
      return results;
    } catch (error) {
      this.emit('workflow_failed', { workflowId, error });
      logger.error('Multi-agent workflow failed', { workflowId, error });
      throw error;
    }
  }

  // Get agent information
  getAgentInfo(agentName: string): AgentConfig | undefined {
    return this.agents.get(agentName);
  }

  // List all agents
  listAgents(): string[] {
    return Array.from(this.agents.keys());
  }

  // Health check
  async healthCheck(): Promise<{ status: string; agents: number; workflows: number }> {
    return {
      status: this.isInitialized ? 'healthy' : 'initializing',
      agents: this.agents.size,
      workflows: this.workflows.size,
    };
  }
}

// Create singleton instance
export const genkitMultiAgentFramework = new GenkitMultiAgentFramework();

// Export for use in other modules
export default genkitMultiAgentFramework;
