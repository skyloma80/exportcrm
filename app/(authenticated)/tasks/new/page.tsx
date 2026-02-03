'use client';

/**
 * New Task Page
 * 新建任务页面
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useToast } from '@/hooks/use-toast';
import { TaskForm, TaskFormData } from '@/components/tasks/task-form';
import { taskService } from '@/lib/pocketbase/services/tasks';

export default function NewTaskPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: TaskFormData) => {
    setLoading(true);
    try {
      const task = await taskService.createTask({
        title: data.title,
        description: data.description,
        due_date: data.due_date || undefined,
        priority: data.priority,
        related_type: data.related_type || undefined,
        related_id: data.related_id || undefined,
      });
      // Update status if not 'pending'
      if (data.status && data.status !== 'pending') {
        await taskService.updateStatus(task.id, data.status);
      }
      toast({
        title: t('common.success'),
        description: t('tasks.createSuccess') || 'Task created successfully',
      });
      router.push('/tasks');
    } catch (error: any) {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div>
          <h1 className="text-3xl font-bold">{t('tasks.newTask')}</h1>
          <p className="text-muted-foreground mt-1">{t('tasks.newDescription') || t('tasks.description')}</p>
        </div>
      </div>
      <div className="max-w-2xl">
        <TaskForm
          onSubmit={handleSubmit}
          isLoading={loading}
        />
      </div>
    </div>
  );
}
