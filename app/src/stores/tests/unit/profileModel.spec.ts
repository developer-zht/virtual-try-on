/**
 * 测试类型：单元测试。
 * 测试对象/范围：Profile Model Store 创建任务、轮询进度和成功接纳模型图片的流程。
 * 隔离内容：不启动 MSW、不连接 Backend、不渲染页面；mock User Model API、任务轮询和 Auth Store。
 */
import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@/api/types/tasks';

const dependencies = vi.hoisted(() => ({
  createUserModel: vi.fn(),
  pollTask: vi.fn(),
  acceptAvatarUrl: vi.fn(),
}));

vi.mock('@/api/userModel', () => ({ createUserModel: dependencies.createUserModel }));
vi.mock('@/api/tasks', () => ({ pollTask: dependencies.pollTask }));
vi.mock('../../auth', () => ({
  useAuthStore: () => ({ acceptAvatarUrl: dependencies.acceptAvatarUrl }),
}));

import { useProfileModelStore } from '../../profileModel';

beforeEach(() => {
  setActivePinia(createPinia());
  vi.clearAllMocks();
});

describe('generate 成功流程', () => {
  it('轮询完成前不更新头像，done 后才接纳模型结果', async () => {
    dependencies.createUserModel.mockResolvedValue({
      task_id: 'model-task-001',
      task_type: 'user_model',
      status: 'pending',
      stage: 'queued',
      poll_after_ms: 800,
    });
    let finishPoll: ((task: Task) => void) | undefined;
    dependencies.pollTask.mockImplementation(
      (_id: string, _maxWaitMs: number, onProgress?: (progress: number) => void) => {
        onProgress?.(42);
        return new Promise<Task>((resolve) => {
          finishPoll = resolve;
        });
      },
    );
    const store = useProfileModelStore();

    const generating = store.generate();
    await vi.waitFor(() => expect(store.progress).toBe(42));

    expect(dependencies.createUserModel).toHaveBeenCalledWith({});
    expect(dependencies.pollTask).toHaveBeenCalledWith(
      'model-task-001',
      600_000,
      expect.any(Function),
    );
    expect(dependencies.acceptAvatarUrl).not.toHaveBeenCalled();

    finishPoll?.({
      id: 'model-task-001',
      task_type: 'user_model',
      status: 'done',
      stage: 'completed',
      progress: 100,
      poll_after_ms: 0,
      user_model_result: {
        model_image_url: '/new-model.png',
        generation_mode: 'virtual',
      },
      created_at: '2026-07-23T00:00:00Z',
      completed_at: '2026-07-23T00:01:00Z',
    });

    await expect(generating).resolves.toBe(true);
    expect(dependencies.acceptAvatarUrl).toHaveBeenCalledWith('/new-model.png');
    expect(store.status).toBe('idle');
    expect(store.progress).toBe(100);
    expect(store.taskId).toBeNull();
  });
});

describe('generate 失败流程', () => {
  it('任务 failed 时保存错误并且不替换旧头像', async () => {
    dependencies.createUserModel.mockResolvedValue({
      task_id: 'failed-task',
      task_type: 'user_model',
      status: 'pending',
      stage: 'queued',
      poll_after_ms: 800,
    });
    dependencies.pollTask.mockResolvedValue({
      id: 'failed-task',
      task_type: 'user_model',
      status: 'failed',
      stage: 'failed',
      progress: 63,
      poll_after_ms: 0,
      error_code: 'MODEL_FAILED',
      error_message: '模型生成失败，请重试',
      created_at: '2026-07-23T00:00:00Z',
    });
    const store = useProfileModelStore();

    await expect(store.generate()).resolves.toBe(false);

    expect(dependencies.acceptAvatarUrl).not.toHaveBeenCalled();
    expect(store.status).toBe('failed');
    expect(store.error).toBe('模型生成失败，请重试');
    expect(store.taskId).toBeNull();
    expect(store.progress).toBe(0);
  });

  it('done 缺少模型图片时进入可重试失败状态', async () => {
    dependencies.createUserModel.mockResolvedValue({
      task_id: 'empty-result-task',
      task_type: 'user_model',
      status: 'pending',
      stage: 'queued',
      poll_after_ms: 800,
    });
    dependencies.pollTask.mockResolvedValue({
      id: 'empty-result-task',
      task_type: 'user_model',
      status: 'done',
      stage: 'completed',
      progress: 100,
      poll_after_ms: 0,
      created_at: '2026-07-23T00:00:00Z',
    });
    const store = useProfileModelStore();

    await expect(store.generate()).resolves.toBe(false);
    expect(store.error).toBe('模型任务已完成，但没有返回图片');
    expect(dependencies.acceptAvatarUrl).not.toHaveBeenCalled();
  });

  it('创建请求抛错时保存可重试错误状态', async () => {
    dependencies.createUserModel.mockRejectedValue(new Error('网络中断'));
    const store = useProfileModelStore();

    await expect(store.generate()).resolves.toBe(false);
    expect(store.status).toBe('failed');
    expect(store.error).toBe('网络中断');
    expect(store.taskId).toBeNull();
    expect(store.progress).toBe(0);
    expect(dependencies.acceptAvatarUrl).not.toHaveBeenCalled();
  });

  it('提交中再次调用不会创建第二个任务', async () => {
    let finishCreate: ((value: unknown) => void) | undefined;
    dependencies.createUserModel.mockImplementation(
      () =>
        new Promise((resolve) => {
          finishCreate = resolve;
        }),
    );
    const store = useProfileModelStore();

    const first = store.generate();
    const second = store.generate();

    await expect(second).resolves.toBe(false);
    expect(dependencies.createUserModel).toHaveBeenCalledTimes(1);

    finishCreate?.({
      task_id: 'model-task-guard',
      task_type: 'user_model',
      status: 'pending',
      stage: 'queued',
      poll_after_ms: 800,
    });
    dependencies.pollTask.mockResolvedValue({
      id: 'model-task-guard',
      task_type: 'user_model',
      status: 'failed',
      stage: 'failed',
      progress: 0,
      poll_after_ms: 0,
      error_message: '结束测试任务',
      created_at: '2026-07-23T00:00:00Z',
    });
    await first;
  });
});
