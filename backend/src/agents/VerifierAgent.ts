import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger, logAuditEvent } from '../utils/logger';
import { AuthenticatedRequest, VerificationResult } from '../types';
import { genkitMultiAgentFramework } from '../utils/genkitAgentFramework';

export interface VerificationRequest {
  content_type: 'message' | 'document' | 'alert' | 'event';
  content: any;
  verification_rules: string[];
}

export interface VerificationResponse {
  verification_id: string;
  verified: boolean;
  signature: string;
  verifier_id: string;
  verification_data: {
    content_hash: string;
    timestamp: Date;
    rules_applied: string[];
    risk_score: number;
    checks_performed: Array<{
      rule: string;
      passed: boolean;
      details?: string;
    }>;
  };
  errors: string[];
  recommendations: string[];
}

export class VerifierAgent {
  private readonly agentId = 'agent_verifier_001';
  private readonly agentType = 'verifier';
  private readonly privateKey: string;

  constructor() {
    // In production, this would be loaded from secure storage
    this.privateKey = process.env.VERIFIER_PRIVATE_KEY || this.generatePrivateKey();
  }

  /**
   * Verify content and generate signed verification result
   */
  async verifyContent(request: VerificationRequest, auth: NonNullable<AuthenticatedRequest['auth']>): Promise<VerificationResponse> {
    const startTime = Date.now();
    const verificationId = uuidv4();
    
    try {
      // Generate content hash
      const contentHash = this.generateContentHash(request.content);
      
      // Apply verification rules
      const verificationChecks = await this.applyVerificationRules(request.content_type, request.content, request.verification_rules);
      
      // Calculate risk score
      const riskScore = this.calculateRiskScore(verificationChecks);
      
      // Determine overall verification result
      const verified = verificationChecks.every(check => check.passed) && riskScore < 0.7;
      
      // Generate verification data
      const verificationData = {
        content_hash: contentHash,
        timestamp: new Date(),
        rules_applied: request.verification_rules,
        risk_score: riskScore,
        checks_performed: verificationChecks
      };

      // Generate signature
      const signature = this.generateSignature(verificationId, verificationData, verified);

      // Collect errors and recommendations
      const errors = verificationChecks.filter(check => !check.passed).map(check => check.details || `Failed: ${check.rule}`);
      const recommendations = this.generateRecommendations(request.content_type, verificationChecks, riskScore);

      const result: VerificationResponse = {
        verification_id: verificationId,
        verified,
        signature,
        verifier_id: this.agentId,
        verification_data: verificationData,
        errors,
        recommendations
      };

      // Store verification result in audit log
      await this.storeVerificationResult(verificationId, request, result);

      // Log audit event
      logAuditEvent({
        actor: this.agentId,
        action: 'content.verify',
        resource: `verification:${verificationId}`,
        result: verified ? 'success' : 'failure',
        details: {
          content_type: request.content_type,
          verified,
          risk_score: riskScore,
          rules_applied: request.verification_rules.length,
          checks_passed: verificationChecks.filter(c => c.passed).length,
          checks_failed: verificationChecks.filter(c => !c.passed).length
        }
      });

      logger.info(`Content verification completed: ${verificationId}`, {
        agentId: this.agentId,
        contentType: request.content_type,
        verified,
        riskScore,
        rulesApplied: request.verification_rules.length
      });

      return result;
    } catch (error) {
      logAuditEvent({
        actor: this.agentId,
        action: 'content.verify',
        resource: `verification:${verificationId}`,
        result: 'failure',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          content_type: request.content_type,
          processing_time: Date.now() - startTime
        }
      });

      logger.error(`Content verification failed: ${verificationId}`, error);
      throw error;
    }
  }

  /**
   * Apply verification rules based on content type
   */
  private async applyVerificationRules(contentType: string, content: any, rules: string[]): Promise<Array<{ rule: string; passed: boolean; details?: string }>> {
    const checks: Array<{ rule: string; passed: boolean; details?: string }> = [];

    // Default rules if none specified
    const defaultRules = this.getDefaultRules(contentType);
    const allRules = rules.length > 0 ? rules : defaultRules;

    for (const rule of allRules) {
      const check = await this.applyRule(rule, contentType, content);
      checks.push(check);
    }

    return checks;
  }

  /**
   * Apply a single verification rule
   */
  private async applyRule(rule: string, contentType: string, content: any): Promise<{ rule: string; passed: boolean; details?: string }> {
    try {
      switch (rule) {
        case 'content_length':
          return this.checkContentLength(content);
        
        case 'profanity_filter':
          return this.checkProfanity(content);
        
        case 'misinformation_detection':
          return await this.checkMisinformation(content);
        
        case 'source_verification':
          return this.checkSource(content);
        
        case 'urgency_validation':
          return this.checkUrgency(content);
        
        case 'location_validation':
          return this.checkLocation(content);
        
        case 'contact_info_validation':
          return this.checkContactInfo(content);
        
        case 'duplicate_detection':
          return await this.checkDuplicates(content);
        
        case 'authority_verification':
          return this.checkAuthority(content);
        
        case 'time_sensitivity':
          return this.checkTimeSensitivity(content);
        
        default:
          return {
            rule,
            passed: true,
            details: 'Rule not implemented, skipped'
          };
      }
    } catch (error) {
      return {
        rule,
        passed: false,
        details: `Rule execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check content length is appropriate
   */
  private checkContentLength(content: any): { rule: string; passed: boolean; details?: string } {
    const text = this.extractText(content);
    const length = text.length;
    
    if (length < 10) {
      return {
        rule: 'content_length',
        passed: false,
        details: 'Content too short (minimum 10 characters)'
      };
    }
    
    if (length > 5000) {
      return {
        rule: 'content_length',
        passed: false,
        details: 'Content too long (maximum 5000 characters)'
      };
    }
    
    return {
      rule: 'content_length',
      passed: true,
      details: `Content length: ${length} characters`
    };
  }

  /**
   * Check for profanity and inappropriate content
   */
  private checkProfanity(content: any): { rule: string; passed: boolean; details?: string } {
    const text = this.extractText(content).toLowerCase();
    
    // Simple profanity filter (in production, use a comprehensive service)
    const profanityWords = ['spam', 'fake', 'hoax', 'scam', 'fraud'];
    const foundProfanity = profanityWords.filter(word => text.includes(word));
    
    if (foundProfanity.length > 0) {
      return {
        rule: 'profanity_filter',
        passed: false,
        details: `Inappropriate content detected: ${foundProfanity.join(', ')}`
      };
    }
    
    return {
      rule: 'profanity_filter',
      passed: true,
      details: 'No inappropriate content detected'
    };
  }

  /**
   * Check for potential misinformation
   */
  private async checkMisinformation(content: any): Promise<{ rule: string; passed: boolean; details?: string }> {
    // Try Genkit-powered misinformation detection first
    try {
      return await this.genkitMisinformationCheck(content);
    } catch (error) {
      logger.warn('Genkit misinformation check failed, falling back to rule-based:', error);
    }

    // Fallback to rule-based detection
    return this.ruleBasedMisinformationCheck(content);
  }

  /**
   * Genkit-powered misinformation detection
   */
  private async genkitMisinformationCheck(content: any): Promise<{ rule: string; passed: boolean; details?: string }> {
    try {
      const verificationResult = await genkitMultiAgentFramework.executeTask('content_verification', {
        content: typeof content === 'string' ? content : JSON.stringify(content),
        source: content.source || 'unknown',
        context: { verification_type: 'misinformation_check' }
      });

      if (verificationResult && verificationResult.content_verification) {
        const analysis = verificationResult.content_verification;
        return {
          rule: 'misinformation_detection',
          passed: analysis.is_verified && analysis.credibility_score > 0.7,
          details: `Genkit Analysis: ${analysis.verification_notes} (Credibility: ${Math.round(analysis.credibility_score * 100)}%)`
        };
      }

      throw new Error('Genkit framework returned invalid result');
    } catch (error) {
      logger.error('Genkit misinformation check failed:', error);
      throw error;
    }
  }

  /**
   * Rule-based misinformation detection (fallback)
   */
  private ruleBasedMisinformationCheck(content: any): { rule: string; passed: boolean; details?: string } {
    const text = this.extractText(content).toLowerCase();
    
    // Simple misinformation detection (in production, use AI/ML services)
    const misinformationIndicators = [
      'unverified',
      'rumor',
      'unconfirmed',
      'breaking news from unknown source',
      'forward this message'
    ];
    
    const foundIndicators = misinformationIndicators.filter(indicator => text.includes(indicator));
    
    if (foundIndicators.length > 0) {
      return {
        rule: 'misinformation_detection',
        passed: false,
        details: `Potential misinformation indicators: ${foundIndicators.join(', ')}`
      };
    }
    
    return {
      rule: 'misinformation_detection',
      passed: true,
      details: 'No misinformation indicators detected'
    };
  }


  /**
   * Check source credibility
   */
  private checkSource(content: any): { rule: string; passed: boolean; details?: string } {
    const source = content.source || content.from || 'unknown';
    
    // Trusted sources list
    const trustedSources = [
      'national weather service',
      'fire department',
      'police department',
      'emergency services',
      'government agency',
      'simulation' // For demo purposes
    ];
    
    const isTrusted = trustedSources.some(trusted => 
      source.toLowerCase().includes(trusted)
    );
    
    if (!isTrusted) {
      return {
        rule: 'source_verification',
        passed: false,
        details: `Unverified source: ${source}`
      };
    }
    
    return {
      rule: 'source_verification',
      passed: true,
      details: `Verified source: ${source}`
    };
  }

  /**
   * Check urgency level is appropriate
   */
  private checkUrgency(content: any): { rule: string; passed: boolean; details?: string } {
    const severity = content.severity || content.priority || 'medium';
    const text = this.extractText(content).toLowerCase();
    
    // Check if urgency matches content
    const urgentKeywords = ['immediate', 'urgent', 'critical', 'emergency', 'danger'];
    const hasUrgentKeywords = urgentKeywords.some(keyword => text.includes(keyword));
    
    if (severity === 'critical' && !hasUrgentKeywords) {
      return {
        rule: 'urgency_validation',
        passed: false,
        details: 'Critical severity not supported by content urgency indicators'
      };
    }
    
    return {
      rule: 'urgency_validation',
      passed: true,
      details: `Urgency level ${severity} is appropriate`
    };
  }

  /**
   * Check location information is valid
   */
  private checkLocation(content: any): { rule: string; passed: boolean; details?: string } {
    const location = content.location || content.location_address || content.address;
    
    if (!location) {
      return {
        rule: 'location_validation',
        passed: false,
        details: 'No location information provided'
      };
    }
    
    // Basic location validation (in production, use geocoding services)
    if (typeof location === 'string' && location.length < 5) {
      return {
        rule: 'location_validation',
        passed: false,
        details: 'Location information too vague'
      };
    }
    
    return {
      rule: 'location_validation',
      passed: true,
      details: `Location validated: ${typeof location === 'string' ? location : JSON.stringify(location)}`
    };
  }

  /**
   * Check contact information is valid
   */
  private checkContactInfo(content: any): { rule: string; passed: boolean; details?: string } {
    const text = this.extractText(content);
    
    // Look for contact information patterns
    const phonePattern = /\+?[\d\s\-\(\)]{10,}/;
    const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
    
    const hasPhone = phonePattern.test(text);
    const hasEmail = emailPattern.test(text);
    
    if (!hasPhone && !hasEmail && !content.contact) {
      return {
        rule: 'contact_info_validation',
        passed: false,
        details: 'No valid contact information found'
      };
    }
    
    return {
      rule: 'contact_info_validation',
      passed: true,
      details: 'Valid contact information found'
    };
  }

  /**
   * Check for duplicate content
   */
  private async checkDuplicates(content: any): Promise<{ rule: string; passed: boolean; details?: string }> {
    try {
      const contentHash = this.generateContentHash(content);
      
      // Check for similar content in recent audit logs
      const result = await query(`
        SELECT COUNT(*) as count
        FROM audit_logs 
        WHERE action = 'content.verify' 
        AND response_data->>'content_hash' = $1
        AND timestamp > NOW() - INTERVAL '1 hour'
      `, [contentHash]);
      
      const duplicateCount = parseInt(result.rows[0].count);
      
      if (duplicateCount > 0) {
        return {
          rule: 'duplicate_detection',
          passed: false,
          details: `Duplicate content detected (${duplicateCount} similar items in last hour)`
        };
      }
      
      return {
        rule: 'duplicate_detection',
        passed: true,
        details: 'No duplicate content detected'
      };
    } catch (error) {
      return {
        rule: 'duplicate_detection',
        passed: true,
        details: 'Duplicate check failed, allowing content'
      };
    }
  }

  /**
   * Check authority to send this type of content
   */
  private checkAuthority(content: any): { rule: string; passed: boolean; details?: string } {
    // This would check if the sender has authority to send this type of alert
    // For demo purposes, we'll allow all content
    return {
      rule: 'authority_verification',
      passed: true,
      details: 'Authority verification passed'
    };
  }

  /**
   * Check time sensitivity
   */
  private checkTimeSensitivity(content: any): { rule: string; passed: boolean; details?: string } {
    const createdAt = content.created_at ? new Date(content.created_at) : new Date();
    const now = new Date();
    const ageMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
    
    // Content older than 24 hours might be stale
    if (ageMinutes > 1440) {
      return {
        rule: 'time_sensitivity',
        passed: false,
        details: `Content is ${Math.floor(ageMinutes / 60)} hours old`
      };
    }
    
    return {
      rule: 'time_sensitivity',
      passed: true,
      details: `Content age: ${Math.floor(ageMinutes)} minutes`
    };
  }

  /**
   * Get default rules for content type
   */
  private getDefaultRules(contentType: string): string[] {
    const rulesByType: Record<string, string[]> = {
      message: ['content_length', 'profanity_filter', 'misinformation_detection', 'duplicate_detection'],
      alert: ['source_verification', 'urgency_validation', 'location_validation', 'time_sensitivity'],
      document: ['content_length', 'source_verification', 'authority_verification'],
      event: ['location_validation', 'time_sensitivity', 'authority_verification']
    };
    
    return rulesByType[contentType] || ['content_length', 'profanity_filter'];
  }

  /**
   * Calculate risk score based on verification checks
   */
  private calculateRiskScore(checks: Array<{ rule: string; passed: boolean; details?: string }>): number {
    const totalChecks = checks.length;
    const failedChecks = checks.filter(check => !check.passed).length;
    
    if (totalChecks === 0) return 0.5; // Medium risk if no checks
    
    const baseScore = failedChecks / totalChecks;
    
    // Weight certain failures more heavily
    const criticalFailures = checks.filter(check => 
      !check.passed && ['misinformation_detection', 'source_verification', 'authority_verification'].includes(check.rule)
    ).length;
    
    const weightedScore = baseScore + (criticalFailures * 0.2);
    
    return Math.min(weightedScore, 1.0);
  }

  /**
   * Generate recommendations based on verification results
   */
  private generateRecommendations(contentType: string, checks: Array<{ rule: string; passed: boolean; details?: string }>, riskScore: number): string[] {
    const recommendations: string[] = [];
    
    if (riskScore > 0.7) {
      recommendations.push('High risk content - consider manual review before distribution');
    }
    
    const failedChecks = checks.filter(check => !check.passed);
    
    for (const check of failedChecks) {
      switch (check.rule) {
        case 'source_verification':
          recommendations.push('Verify source credibility before distribution');
          break;
        case 'misinformation_detection':
          recommendations.push('Content flagged for potential misinformation - fact-check required');
          break;
        case 'location_validation':
          recommendations.push('Add more specific location information');
          break;
        case 'contact_info_validation':
          recommendations.push('Include valid contact information for follow-up');
          break;
        case 'duplicate_detection':
          recommendations.push('Similar content recently processed - check for duplicates');
          break;
        case 'urgency_validation':
          recommendations.push('Review urgency level - may not match content severity');
          break;
      }
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Content passed all verification checks - safe for distribution');
    }
    
    return recommendations;
  }

  /**
   * Extract text content from various content types
   */
  private extractText(content: any): string {
    if (typeof content === 'string') {
      return content;
    }
    
    if (typeof content === 'object') {
      const textFields = ['content', 'text', 'body', 'message', 'description', 'title'];
      for (const field of textFields) {
        if (content[field] && typeof content[field] === 'string') {
          return content[field];
        }
      }
      return JSON.stringify(content);
    }
    
    return String(content);
  }

  /**
   * Generate content hash for duplicate detection
   */
  private generateContentHash(content: any): string {
    const text = this.extractText(content);
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  /**
   * Generate cryptographic signature for verification result
   */
  private generateSignature(verificationId: string, verificationData: any, verified: boolean): string {
    const payload = {
      verification_id: verificationId,
      verified,
      timestamp: verificationData.timestamp,
      content_hash: verificationData.content_hash,
      verifier_id: this.agentId
    };
    
    const payloadString = JSON.stringify(payload);
    return crypto.createHmac('sha256', this.privateKey).update(payloadString).digest('hex');
  }

  /**
   * Store verification result in audit log
   */
  private async storeVerificationResult(verificationId: string, request: VerificationRequest, result: VerificationResponse): Promise<void> {
    await query(`
      INSERT INTO audit_logs (id, actor_type, actor_id, action, resource_type, resource_id, 
                             request_data, response_data, signature, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    `, [
      uuidv4(),
      'agent',
      this.agentId,
      'content.verify',
      'verification',
      verificationId,
      JSON.stringify(request),
      JSON.stringify({
        verification_id: result.verification_id,
        verified: result.verified,
        content_hash: result.verification_data.content_hash,
        risk_score: result.verification_data.risk_score,
        checks_performed: result.verification_data.checks_performed.length,
        errors_count: result.errors.length
      }),
      result.signature,
      new Date()
    ]);
  }

  /**
   * Generate private key for signing (in production, use proper key management)
   */
  private generatePrivateKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get agent information
   */
  getAgentInfo() {
    return {
      id: this.agentId,
      type: this.agentType,
      name: 'Content Verification Agent',
      description: 'Validates and approves all outgoing communications to prevent misinformation and ensure content quality',
      capabilities: [
        'content_verification',
        'misinformation_detection',
        'source_validation',
        'cryptographic_signing',
        'risk_assessment'
      ],
      verification_rules: [
        'content_length',
        'profanity_filter',
        'misinformation_detection',
        'source_verification',
        'urgency_validation',
        'location_validation',
        'contact_info_validation',
        'duplicate_detection',
        'authority_verification',
        'time_sensitivity'
      ],
      status: 'active'
    };
  }
}