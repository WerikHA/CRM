import React from 'react';
import { DemandTask, Client, User } from '../types';
import DemandsView from './DemandsView';

interface RecordingWorkflowViewProps {
  tasks: DemandTask[];
  setTasks: React.Dispatch<React.SetStateAction<DemandTask[]>>;
  clients: Client[];
  users: User[];
}

export default function RecordingWorkflowView({ tasks, setTasks, clients, users }: RecordingWorkflowViewProps) {
  const recordingTasks = tasks.filter(t => t.type === 'recording');
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 tracking-tight transition-colors">Workflow de Gravação</h1>
          <p className="text-sm text-gray-500 dark:text-gray-300">Gestão de demandas de gravação.</p>
        </div>
      </div>
      <DemandsView 
        tasks={recordingTasks}
        setTasks={setTasks}
        clients={clients}
        users={users}
      />
    </div>
  );
}
