import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/connection';
import { logger, logAuditEvent, logExternalApiCall } from '../utils/logger';
import { AuthenticatedRequest, NotFoundError, ExternalServiceError } from '../types';
import { GoogleCalendarService } from '../utils/googleCalendar';

export interface SchedulingRequest {
  alert_id: string;
  event_type: 'relief_camp' | 'evacuation' | 'medical_response' | 'fire_suppression' | 'search_rescue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  duration_hours: number;
  resources: string[];
  assignees: string[];
}

export interface SchedulingResult {
  event_id: string;
  calendar_event_id?: string;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
  assignees: string[];
  resources: string[];
  status: 'scheduled' | 'failed';
  external_integrations: {
    google_calendar: {
      success: boolean;
      event_id?: string;
      error?: string;
    };
  };
}

export class SchedulerAgent {
  private readonly agentId = 'agent_scheduler_001';
  private readonly agentType = 'scheduler';
  private googleCalendar: GoogleCalendarService;

  constructor() {
    this.googleCalendar = new GoogleCalendarService();
  }

  /**
   * Schedule an event based on alert and requirements
   */
  async scheduleEvent(request: SchedulingRequest, auth: NonNullable<AuthenticatedRequest['auth']>): Promise<SchedulingResult> {
    const startTime = Date.now();
    
    try {
      // Fetch alert details
      const alertResult = await query(`
        SELECT id, type, severity, title, description, location_address, location_lat, location_lng
        FROM alerts 
        WHERE id = $1
      `, [request.alert_id]);

      if (alertResult.rows.length === 0) {
        throw new NotFoundError(`Alert with ID ${request.alert_id} not found`);
      }

      const alert = alertResult.rows[0];
      
      // Generate event details
      const eventDetails = this.generateEventDetails(alert, request);
      const eventId = uuidv4();

      // Calculate start and end times
      const startDateTime = this.calculateStartTime(request.priority);
      const endDateTime = new Date(startDateTime.getTime() + (request.duration_hours * 60 * 60 * 1000));

      // Create event in database
      await query(`
        INSERT INTO events (id, alert_id, title, description, start_time, end_time, location, assignees, resources, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      `, [
        eventId,
        request.alert_id,
        eventDetails.title,
        eventDetails.description,
        startDateTime,
        endDateTime,
        alert.location_address,
        request.assignees,
        request.resources,
        'scheduled'
      ]);

      // Try to create Google Calendar event
      let googleCalendarResult = {
        success: false,
        event_id: undefined as string | undefined,
        error: undefined as string | undefined
      };

      try {
        const calendarEvent = await this.googleCalendar.createEvent({
          summary: eventDetails.title,
          description: eventDetails.description,
          start: {
            dateTime: startDateTime.toISOString(),
            timeZone: 'Asia/Kolkata'
          },
          end: {
            dateTime: endDateTime.toISOString(),
            timeZone: 'Asia/Kolkata'
          },
          location: alert.location_address,
          attendees: request.assignees.map(email => ({ email, displayName: email }))
        });

        if (calendarEvent.id) {
          googleCalendarResult = {
            success: true,
            event_id: calendarEvent.id,
            error: undefined
          };

          // Update database with calendar event ID
          await query('UPDATE events SET calendar_event_id = $1 WHERE id = $2', [calendarEvent.id, eventId]);
        }

        logExternalApiCall({
          service: 'google_calendar',
          endpoint: '/calendar/v3/events',
          method: 'POST',
          statusCode: 200,
          duration: Date.now() - startTime,
          success: true
        });
      } catch (calendarError) {
        googleCalendarResult = {
          success: false,
          event_id: undefined,
          error: calendarError instanceof Error ? calendarError.message : 'Unknown error'
        };

        logExternalApiCall({
          service: 'google_calendar',
          endpoint: '/calendar/v3/events',
          method: 'POST',
          statusCode: 500,
          duration: Date.now() - startTime,
          success: false,
          error: googleCalendarResult.error || undefined
        });

        logger.warn(`Google Calendar integration failed for event ${eventId}:`, calendarError);
      }

      const result: SchedulingResult = {
        event_id: eventId,
        calendar_event_id: googleCalendarResult.event_id,
        title: eventDetails.title,
        description: eventDetails.description,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        location: alert.location_address,
        assignees: request.assignees,
        resources: request.resources,
        status: 'scheduled',
        external_integrations: {
          google_calendar: googleCalendarResult
        }
      };

      // Log audit event
      logAuditEvent({
        actor: this.agentId,
        action: 'event.schedule',
        resource: `event:${eventId}`,
        result: 'success',
        details: {
          alert_id: request.alert_id,
          event_type: request.event_type,
          priority: request.priority,
          duration_hours: request.duration_hours,
          google_calendar_success: googleCalendarResult.success
        }
      });

      logger.info(`Event scheduled successfully: ${eventId}`, {
        agentId: this.agentId,
        eventType: request.event_type,
        priority: request.priority,
        alertId: request.alert_id,
        calendarIntegration: googleCalendarResult.success
      });

      return result;
    } catch (error) {
      logAuditEvent({
        actor: this.agentId,
        action: 'event.schedule',
        resource: `alert:${request.alert_id}`,
        result: 'failure',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          event_type: request.event_type,
          priority: request.priority
        }
      });

      logger.error(`Event scheduling failed for alert ${request.alert_id}:`, error);
      throw error;
    }
  }

  /**
   * Generate event title and description based on alert and request
   */
  private generateEventDetails(alert: any, request: SchedulingRequest): { title: string; description: string } {
    const eventTypeNames = {
      relief_camp: 'Emergency Relief Camp Setup',
      evacuation: 'Evacuation Coordination',
      medical_response: 'Medical Emergency Response',
      fire_suppression: 'Fire Suppression Operations',
      search_rescue: 'Search and Rescue Operations'
    };

    const title = `${eventTypeNames[request.event_type]} - ${alert.title}`;
    
    const description = `
Emergency Response Event

Alert Details:
- Type: ${alert.type}
- Severity: ${alert.severity}
- Location: ${alert.location_address}
- Description: ${alert.description}

Response Details:
- Event Type: ${request.event_type}
- Priority: ${request.priority}
- Duration: ${request.duration_hours} hours
- Required Resources: ${request.resources.join(', ')}
- Assigned Personnel: ${request.assignees.join(', ')}

This event was automatically scheduled by CrisisAssist Emergency Response System.
For updates and coordination, please refer to the CrisisAssist dashboard.
    `.trim();

    return { title, description };
  }

  /**
   * Calculate start time based on priority
   */
  private calculateStartTime(priority: string): Date {
    const now = new Date();
    const delayMinutes = {
      critical: 15,  // Start in 15 minutes
      high: 30,      // Start in 30 minutes
      medium: 60,    // Start in 1 hour
      low: 120       // Start in 2 hours
    };

    const delay = delayMinutes[priority as keyof typeof delayMinutes] || 60;
    return new Date(now.getTime() + (delay * 60 * 1000));
  }

  /**
   * Update event status
   */
  async updateEventStatus(eventId: string, status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled', auth: NonNullable<AuthenticatedRequest['auth']>): Promise<void> {
    try {
      const result = await query('UPDATE events SET status = $1, updated_at = NOW() WHERE id = $2', [status, eventId]);
      
      if (result.rowCount === 0) {
        throw new NotFoundError(`Event with ID ${eventId} not found`);
      }

      logAuditEvent({
        actor: this.agentId,
        action: 'event.status_update',
        resource: `event:${eventId}`,
        result: 'success',
        details: { new_status: status }
      });

      logger.info(`Event status updated: ${eventId} -> ${status}`);
    } catch (error) {
      logger.error(`Failed to update event status: ${eventId}`, error);
      throw error;
    }
  }

  /**
   * Get scheduled events for an alert
   */
  async getEventsByAlert(alertId: string): Promise<any[]> {
    try {
      const result = await query(`
        SELECT id, title, description, start_time, end_time, location, assignees, resources, status, calendar_event_id
        FROM events 
        WHERE alert_id = $1
        ORDER BY start_time ASC
      `, [alertId]);

      return result.rows;
    } catch (error) {
      logger.error(`Failed to fetch events for alert: ${alertId}`, error);
      throw error;
    }
  }

  /**
   * Get agent information
   */
  getAgentInfo() {
    return {
      id: this.agentId,
      type: this.agentType,
      name: 'Resource Scheduler Agent',
      description: 'Creates and manages calendar events for relief coordination and resource scheduling',
      capabilities: [
        'event_scheduling',
        'resource_allocation',
        'calendar_integration',
        'timeline_management'
      ],
      integrations: [
        'google_calendar',
        'outlook_calendar'
      ],
      status: 'active'
    };
  }
}