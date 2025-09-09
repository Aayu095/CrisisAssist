import { google } from 'googleapis';
import { logger } from './logger';
import axios from 'axios';

export interface GoogleCalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

export class GoogleCalendarService {
  private readonly baseUrl = 'https://www.googleapis.com/calendar/v3';
  private accessToken: string | null = null;

  constructor() {
    // In a real implementation, this would get the access token from Descope Outbound
    // For demo purposes, we'll simulate the integration
    this.accessToken = process.env.GOOGLE_CALENDAR_ACCESS_TOKEN || null;
  }

  /**
   * Create a calendar event
   */
  async createEvent(event: GoogleCalendarEvent): Promise<GoogleCalendarEvent> {
    try {
      // In demo mode, simulate successful calendar creation
      if (process.env.DEMO_MODE === 'true') {
        return this.simulateCalendarEvent(event);
      }

      if (!this.accessToken) {
        throw new Error('Google Calendar authentication failed');
      }

      const response = await axios.post(
        `${this.baseUrl}/calendars/primary/events`,
        event,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info('Google Calendar event created successfully', {
        eventId: response.data.id,
        summary: event.summary
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        logger.error('Google Calendar API error:', {
          status: statusCode,
          message: errorMessage,
          event: event.summary
        });

        throw new Error(`Google Calendar API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error creating calendar event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(eventId: string, event: Partial<GoogleCalendarEvent>): Promise<GoogleCalendarEvent> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        return this.simulateCalendarEvent({ ...event, id: eventId } as GoogleCalendarEvent);
      }

      if (!this.accessToken) {
        throw new Error('Google Calendar authentication failed');
      }

      const response = await axios.put(
        `${this.baseUrl}/calendars/primary/events/${eventId}`,
        event,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      );

      logger.info('Google Calendar event updated successfully', {
        eventId: response.data.id,
        summary: event.summary
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        logger.error('Google Calendar API error:', {
          status: statusCode,
          message: errorMessage,
          eventId
        });

        throw new Error(`Google Calendar API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error updating calendar event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(eventId: string): Promise<void> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        logger.info('Demo mode: Calendar event deletion simulated', { eventId });
        return;
      }

      if (!this.accessToken) {
        throw new Error('Google Calendar authentication failed');
      }

      await axios.delete(
        `${this.baseUrl}/calendars/primary/events/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          timeout: 10000
        }
      );

      logger.info('Google Calendar event deleted successfully', { eventId });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        logger.error('Google Calendar API error:', {
          status: statusCode,
          message: errorMessage,
          eventId
        });

        throw new Error(`Google Calendar API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error deleting calendar event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }

  /**
   * Get calendar events
   */
  async getEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      if (process.env.DEMO_MODE === 'true') {
        return this.simulateGetEvents();
      }

      if (!this.accessToken) {
        throw new Error('Google Calendar authentication failed');
      }

      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);
      params.append('singleEvents', 'true');
      params.append('orderBy', 'startTime');

      const response = await axios.get(
        `${this.baseUrl}/calendars/primary/events?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          timeout: 10000
        }
      );

      return response.data.items || [];
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const statusCode = error.response?.status || 500;
        const errorMessage = error.response?.data?.error?.message || error.message;
        
        logger.error('Google Calendar API error:', {
          status: statusCode,
          message: errorMessage
        });

        throw new Error(`Google Calendar API error: ${errorMessage}`);
      }
      
      logger.error('Unexpected error fetching calendar events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  /**
   * Simulate calendar event creation for demo mode
   */
  private simulateCalendarEvent(event: GoogleCalendarEvent): GoogleCalendarEvent {
    return {
      ...event,
      id: event.id || `demo-${Date.now()}`
    };
  }

  /**
   * Simulate demo calendar events for testing
   */
  private simulateGetEvents(): GoogleCalendarEvent[] {
    const now = new Date();
    return [
      {
        id: 'demo-event-1',
        summary: 'Emergency Response Coordination',
        description: 'Coordinate relief efforts for recent disaster',
        start: {
          dateTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Asia/Kolkata'
        },
        end: {
          dateTime: new Date(now.getTime() + 8 * 60 * 60 * 1000).toISOString(),
          timeZone: 'Asia/Kolkata'
        },
        location: 'Indore Community Center',
        attendees: [
          { email: 'volunteer1@example.com', displayName: 'Volunteer 1' },
          { email: 'volunteer2@example.com', displayName: 'Volunteer 2' }
        ]
      }
    ];
  }

  /**
   * Set access token (would be called by Descope integration)
   */
  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return !!this.accessToken || process.env.DEMO_MODE === 'true';
  }
}