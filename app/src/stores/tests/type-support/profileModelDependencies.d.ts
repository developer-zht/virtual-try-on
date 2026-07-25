import type { Task, TaskCreated } from '@/api/types/tasks';
import type { UserModelRequest } from '../../../api/types/userModel';

export declare function createUserModel(body: UserModelRequest): Promise<TaskCreated>;
export declare function pollTask(
  id: string,
  maxWaitMs?: number,
  onProgress?: (progress: number) => void,
): Promise<Task>;
