/**
 * 测试类型：集成测试。
 * 测试对象/范围：MainLayout 对全局 DecisionDialogHost 的唯一挂载接线。
 * 隔离内容：不挂载 Layout、不创建 Quasar 或 Router；只检查全局 Host 的导入和模板位置。
 * 修改原因：全局 Dialog 必须在页面路由之外常驻，路由离开守卫等待选择时才能继续显示。
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const layoutSource = readFileSync(new URL('../../MainLayout.vue', import.meta.url), 'utf8');

describe('MainLayout DecisionDialogHost 接线', () => {
  it('导入并且只挂载一个全局 Host', () => {
    expect(layoutSource).toContain(
      "import DecisionDialogHost from '@/components/DecisionDialogHost.vue'",
    );
    expect(layoutSource.match(/<DecisionDialogHost\s*\/>/g)).toHaveLength(1);
  });

  it('保留现有 NotifyHost 与 ConfirmHost', () => {
    expect(layoutSource).toContain('<NotifyHost />');
    expect(layoutSource).toContain('<ConfirmHost />');
  });
});
