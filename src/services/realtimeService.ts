import { supabase } from '../lib/supabase';
import { RealtimeChannel, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';

export type RealtimeCallback = (payload: any) => void;
export type ConnectionStatusCallback = (status: string, error?: any) => void;

class RealtimeService {
  private channels: Map<string, RealtimeChannel> = new Map();
  private debug = false;

  enableDebug(enable: boolean = true) {
    this.debug = enable;
  }

  private log(...args: any[]) {
  }

  subscribeToTable(
    tableName: string,
    callback: RealtimeCallback,
    filter?: { column: string; value: any }
  ): () => void {
    const channelName = filter
      ? `${tableName}_${filter.column}_${filter.value}`
      : tableName;

    if (this.channels.has(channelName)) {
      this.log(`Channel ${channelName} already exists, returning existing unsubscribe`);
      return () => this.unsubscribe(channelName);
    }

    this.log(`Creating channel for ${channelName}`);

    let channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          this.log(`Received event on ${tableName}:`, payload.eventType, payload.new);
          callback(payload);
        }
      )
      .subscribe((status, error) => {
        if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
          this.log(`✓ Successfully subscribed to ${channelName}`);
        } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
        } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
          this.log(`Channel ${channelName} closed`);
        }
      });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  subscribeToMultipleTables(
    tableNames: string[],
    callback: RealtimeCallback,
    onStatusChange?: ConnectionStatusCallback
  ): () => void {
    const channelName = 'dashboard-realtime-all';

    if (this.channels.has(channelName)) {
      this.log(`Multi-table channel already exists`);
      return () => this.unsubscribe(channelName);
    }

    this.log(`Creating multi-table channel for: ${tableNames.join(', ')}`);

    let channel = supabase.channel(channelName);

    tableNames.forEach((tableName) => {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: tableName,
        },
        (payload) => {
          this.log(`Event from ${tableName}:`, payload.eventType, payload.table);
          callback(payload);
        }
      );
    });

    channel.subscribe((status, error) => {
      if (status === REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) {
        this.log(`✓ Multi-table channel subscribed successfully`);
        onStatusChange?.('connected');
      } else if (status === REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR) {
        onStatusChange?.('error', error);
      } else if (status === REALTIME_SUBSCRIBE_STATES.TIMED_OUT) {
        onStatusChange?.('timeout');
      } else if (status === REALTIME_SUBSCRIBE_STATES.CLOSED) {
        this.log(`Multi-table channel closed`);
        onStatusChange?.('closed');
      }
    });

    this.channels.set(channelName, channel);

    return () => this.unsubscribe(channelName);
  }

  getChannelStatus(channelName: string): string | undefined {
    const channel = this.channels.get(channelName);
    return channel?.state;
  }

  private unsubscribe(channelName: string) {
    const channel = this.channels.get(channelName);
    if (channel) {
      this.log(`Unsubscribing from ${channelName}`);
      supabase.removeChannel(channel);
      this.channels.delete(channelName);
    }
  }

  unsubscribeAll() {
    this.log(`Unsubscribing from all channels (${this.channels.size})`);
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  getActiveChannelsCount(): number {
    return this.channels.size;
  }
}

export const realtimeService = new RealtimeService();
