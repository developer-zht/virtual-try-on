import { API } from './_configs/url';
import { request } from './request';
import type { TaskCreated } from './types/tasks';
import type { UserModelRequest } from './types/userModel';

export function createUserModel(body: UserModelRequest): Promise<TaskCreated> {
  return request<TaskCreated>({ url: API.user.model, method: 'POST', data: body });
}
