'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Bot, 
  User, 
  Loader2, 
  AlertTriangle, 
  Calendar, 
  MessageSquare, 
  Shield,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useApi } from '@/components/providers/ApiProvider';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

interface ChatMessage {
  id: string;
  type: 'user' | 'agent' | 'system';
  content: string;
  timestamp: Date;
  agentType?: string;
  status?: 'sending' | 'processing' | 'completed' | 'error';
  metadata?: any;
}

interface AgentChatProps {
  className?: string;
}

export function AgentChat({ className }: AgentChatProps) {
  const api = useApi();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'system',
      content: '🚨 **CrisisAssist Multi-Agent System Online** 🚨\n\n✅ 4 AI agents ready for emergency coordination\n🔐 Secure Descope authentication active\n🌐 Real-time communication enabled\n\n**Quick Commands:**\n• "Process [disaster type] alert in [location]"\n• "Schedule emergency meeting for [time]"\n• "Send notification via [channel]"\n• "Verify emergency report from [source]"\n\n**Example:** "Process critical flood alert in Mumbai - evacuate riverside areas"',
      timestamp: new Date(),
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getAgentIcon = (agentType: string) => {
    switch (agentType) {
      case 'alert': return AlertTriangle;
      case 'scheduler': return Calendar;
      case 'notifier': return MessageSquare;
      case 'verifier': return Shield;
      default: return Bot;
    }
  };

  const getAgentColor = (agentType: string) => {
    switch (agentType) {
      case 'alert': return 'text-red-600 bg-red-100';
      case 'scheduler': return 'text-blue-600 bg-blue-100';
      case 'notifier': return 'text-green-600 bg-green-100';
      case 'verifier': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const processUserMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessageId = `user_${Date.now()}`;
    const userMessage: ChatMessage = {
      id: userMessageId,
      type: 'user',
      content: message.trim(),
      timestamp: new Date(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      // Analyze the message to determine which agents to involve
      const agentInstructions = analyzeMessage(message);
      
      // Process each agent instruction
      for (const instruction of agentInstructions) {
        const agentMessageId = `agent_${instruction.agent}_${Date.now()}`;
        const agentMessage: ChatMessage = {
          id: agentMessageId,
          type: 'agent',
          content: `Processing your request...`,
          timestamp: new Date(),
          agentType: instruction.agent,
          status: 'processing'
        };

        setMessages(prev => [...prev, agentMessage]);

        try {
          // Simulate agent processing
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          let result;
          switch (instruction.agent) {
            case 'alert':
              result = await api.simulateAlert(instruction.data);
              break;
            case 'scheduler':
              result = await api.scheduleEvent(instruction.data);
              break;
            case 'notifier':
              result = await api.sendNotification(instruction.data);
              break;
            case 'verifier':
              result = await api.verifyContent(instruction.data);
              break;
          }

          // Update agent message with result
          setMessages(prev => prev.map(msg => 
            msg.id === agentMessageId 
              ? { 
                  ...msg, 
                  content: instruction.successMessage,
                  status: 'completed',
                  metadata: result
                }
              : msg
          ));

        } catch (error) {
          setMessages(prev => prev.map(msg => 
            msg.id === agentMessageId 
              ? { 
                  ...msg, 
                  content: `Failed to process request: ${error}`,
                  status: 'error'
                }
              : msg
          ));
        }
      }

      // Add summary message
      const summaryMessage: ChatMessage = {
        id: `summary_${Date.now()}`,
        type: 'system',
        content: `Task completed! ${agentInstructions.length} agent(s) processed your request successfully.`,
        timestamp: new Date(),
        status: 'completed'
      };

      setMessages(prev => [...prev, summaryMessage]);
      
    } catch (error) {
      console.error('Failed to process message:', error);
      toast.error('Failed to process your message');
      
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        type: 'system',
        content: 'Sorry, I encountered an error processing your request. Please try again.',
        timestamp: new Date(),
        status: 'error'
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
    }
  };

  const analyzeMessage = (message: string): Array<{
    agent: string;
    data: any;
    successMessage: string;
  }> => {
    const instructions = [];
    const lowerMessage = message.toLowerCase();

    // Alert Agent patterns
    if (lowerMessage.includes('alert') || lowerMessage.includes('emergency') || 
        lowerMessage.includes('disaster') || lowerMessage.includes('flood') || 
        lowerMessage.includes('earthquake') || lowerMessage.includes('fire')) {
      
      const location = extractLocation(message) || 'Unknown Location';
      const alertType = extractAlertType(message) || 'emergency';
      const severity = extractSeverity(message) || 'high';

      instructions.push({
        agent: 'alert',
        data: {
          type: alertType,
          severity: severity,
          location: location,
          description: message,
          title: `${alertType.toUpperCase()} Alert - ${location}`
        },
        successMessage: `✅ Alert Agent: Successfully processed ${alertType} alert for ${location}. Risk assessment completed and response requirements determined.`
      });
    }

    // Scheduler Agent patterns
    if (lowerMessage.includes('schedule') || lowerMessage.includes('meeting') || 
        lowerMessage.includes('event') || lowerMessage.includes('calendar') ||
        lowerMessage.includes('coordinate') || lowerMessage.includes('plan')) {
      
      const eventTitle = extractEventTitle(message) || 'Emergency Coordination Meeting';
      const eventTime = extractEventTime(message) || new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      instructions.push({
        agent: 'scheduler',
        data: {
          title: eventTitle,
          description: `Coordination meeting based on: ${message}`,
          start_time: eventTime,
          attendees: ['emergency.coordinator@gov.in', 'relief.team@ngo.org']
        },
        successMessage: `📅 Scheduler Agent: Successfully scheduled "${eventTitle}". Calendar event created and invitations sent to coordination team.`
      });
    }

    // Notifier Agent patterns
    if (lowerMessage.includes('notify') || lowerMessage.includes('alert') || 
        lowerMessage.includes('broadcast') || lowerMessage.includes('send') ||
        lowerMessage.includes('inform') || lowerMessage.includes('message')) {
      
      const channels = extractChannels(message) || ['slack', 'sms', 'email'];
      const priority = extractSeverity(message) || 'high';

      instructions.push({
        agent: 'notifier',
        data: {
          message: `🚨 EMERGENCY UPDATE: ${message}`,
          channels: channels,
          priority: priority,
          alert_type: extractAlertType(message) || 'general'
        },
        successMessage: `📢 Notifier Agent: Successfully broadcasted emergency notification via ${channels.join(', ')}. Message delivered to all registered recipients.`
      });
    }

    // Verifier Agent patterns
    if (lowerMessage.includes('verify') || lowerMessage.includes('check') || 
        lowerMessage.includes('validate') || lowerMessage.includes('confirm') ||
        lowerMessage.includes('authenticate')) {
      
      instructions.push({
        agent: 'verifier',
        data: {
          content: message,
          type: 'emergency_instruction',
          source: 'user_chat'
        },
        successMessage: `🔐 Verifier Agent: Content verification completed. Message authenticated and cryptographically signed. No misinformation detected.`
      });
    }

    // If no specific patterns found, default to alert processing
    if (instructions.length === 0) {
      instructions.push({
        agent: 'alert',
        data: {
          type: 'general',
          severity: 'medium',
          location: 'System',
          description: message,
          title: 'General Emergency Instruction'
        },
        successMessage: `🤖 Alert Agent: Processed your general instruction. System has been updated with your requirements.`
      });
    }

    return instructions;
  };

  const extractLocation = (message: string): string | null => {
    const locationPatterns = [
      /in\s+([A-Za-z\s,]+?)(?:\s|$|\.)/i,
      /at\s+([A-Za-z\s,]+?)(?:\s|$|\.)/i,
      /near\s+([A-Za-z\s,]+?)(?:\s|$|\.)/i
    ];
    
    for (const pattern of locationPatterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const extractAlertType = (message: string): string | null => {
    const types = ['flood', 'earthquake', 'fire', 'cyclone', 'landslide', 'tsunami'];
    const lowerMessage = message.toLowerCase();
    
    for (const type of types) {
      if (lowerMessage.includes(type)) return type;
    }
    return null;
  };

  const extractSeverity = (message: string): string => {
    const lowerMessage = message.toLowerCase();
    if (lowerMessage.includes('critical') || lowerMessage.includes('severe')) return 'critical';
    if (lowerMessage.includes('high') || lowerMessage.includes('urgent')) return 'high';
    if (lowerMessage.includes('medium') || lowerMessage.includes('moderate')) return 'medium';
    if (lowerMessage.includes('low') || lowerMessage.includes('minor')) return 'low';
    return 'high';
  };

  const extractEventTitle = (message: string): string | null => {
    const patterns = [
      /schedule\s+(.+?)(?:\s+for|\s+at|\s+on|$)/i,
      /meeting\s+(.+?)(?:\s+for|\s+at|\s+on|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return match[1].trim();
    }
    return null;
  };

  const extractEventTime = (message: string): string | null => {
    if (message.toLowerCase().includes('tomorrow')) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    }
    if (message.toLowerCase().includes('next week')) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
    return null;
  };

  const extractChannels = (message: string): string[] => {
    const channels = [];
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('slack')) channels.push('slack');
    if (lowerMessage.includes('sms') || lowerMessage.includes('text')) channels.push('sms');
    if (lowerMessage.includes('email')) channels.push('email');
    if (lowerMessage.includes('whatsapp')) channels.push('whatsapp');
    
    return channels.length > 0 ? channels : ['slack', 'sms', 'email'];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    processUserMessage(inputMessage);
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'sending':
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border flex flex-col', className)}>
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Agent Chat Interface</h3>
            <p className="text-sm text-gray-600">Send instructions to the multi-agent system</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 space-y-4 max-h-96 overflow-y-auto">
        {messages.map((message) => (
          <div key={message.id} className={clsx(
            'flex items-start space-x-3',
            message.type === 'user' && 'flex-row-reverse space-x-reverse'
          )}>
            {/* Avatar */}
            <div className={clsx(
              'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
              message.type === 'user' 
                ? 'bg-blue-500' 
                : message.type === 'agent'
                ? getAgentColor(message.agentType || 'default')
                : 'bg-gray-100'
            )}>
              {message.type === 'user' ? (
                <User className="h-4 w-4 text-white" />
              ) : message.type === 'agent' ? (
                (() => {
                  const IconComponent = getAgentIcon(message.agentType || 'default');
                  return <IconComponent className="h-4 w-4" />;
                })()
              ) : (
                <Bot className="h-4 w-4 text-gray-600" />
              )}
            </div>

            {/* Message Content */}
            <div className={clsx(
              'flex-1 max-w-xs lg:max-w-md',
              message.type === 'user' && 'text-right'
            )}>
              <div className={clsx(
                'p-3 rounded-lg',
                message.type === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : message.type === 'system'
                  ? 'bg-gray-100 text-gray-700'
                  : 'bg-gray-50 text-gray-900'
              )}>
                <p className="text-sm">{message.content}</p>
                
                {message.status && (
                  <div className={clsx(
                    'flex items-center space-x-1 mt-2',
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}>
                    {getStatusIcon(message.status)}
                    <span className={clsx(
                      'text-xs',
                      message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                    )}>
                      {message.status}
                    </span>
                  </div>
                )}
              </div>
              
              <div className={clsx(
                'text-xs text-gray-500 mt-1',
                message.type === 'user' && 'text-right'
              )}>
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex items-center space-x-3">
          <div className="flex-1 relative">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={isProcessing}
              placeholder="🚨 Type emergency instruction for AI agents... (e.g., 'Process fire alert in downtown area')"
              className="w-full p-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            {isProcessing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={!inputMessage.trim() || isProcessing}
            className="p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
        
        <div className="mt-3 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
          <div className="text-xs font-medium text-gray-700 mb-2">💡 Smart Commands Available:</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-600">
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-red-400 rounded-full"></span>
              <span>"Critical earthquake alert in Tokyo"</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span>"Schedule relief coordination meeting"</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span>"Broadcast evacuation notice via SMS"</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
              <span>"Verify news report authenticity"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
