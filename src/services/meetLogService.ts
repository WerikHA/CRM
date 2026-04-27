type LogEntry = {
  timestamp: string;
  message: string;
};

class MeetLogService {
  private logs: LogEntry[] = [];
  private listeners: ((logs: LogEntry[]) => void)[] = [];

  add(message: string) {
    const entry = {
      timestamp: new Date().toLocaleTimeString(),
      message,
    };
    this.logs.push(entry);
    // Keep only last 100 logs to avoid memory issues
    if (this.logs.length > 100) this.logs.shift();
    
    // Notify listeners
    this.listeners.forEach(l => l(this.logs));
    console.log(`[MEET LOG] ${message}`);
  }

  getLogs() {
    return this.logs;
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const meetLogService = new MeetLogService();
