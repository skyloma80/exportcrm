'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/use-i18n';
import { useTasks, useTaskMutations } from '@/hooks/collections/tasks';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Plus, Search, CheckCircle2, Clock, AlertTriangle, Calendar } from 'lucide-react';
import type { TaskWithExpand, TaskStatus, TaskPriority } from '@/lib/pocketbase/services/tasks';

const STATUS_COLORS: Record<TaskStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function TasksPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const { tasks, isLoading, refetch } = useTasks();
  const { completeTask, isLoading: isMutating } = useTaskMutations();

  const filteredTasks = useMemo(() => {
    if (!search) return tasks;
    const searchLower = search.toLowerCase();
    return tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(searchLower) ||
        task.description?.toLowerCase().includes(searchLower)
    );
  }, [tasks, search]);

  const stats = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending').length;
    const overdue = tasks.filter((t) => {
      if (!t.due_date || t.status === 'completed' || t.status === 'cancelled') return false;
      return new Date(t.due_date) < new Date();
    }).length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { total: tasks.length, pending, overdue, completed };
  }, [tasks]);

  const handleComplete = async (id: string) => {
    const result = await completeTask(id);
    if (result) {
      toast({ title: t('tasks.completeSuccess') });
      refetch();
    }
  };

  const isOverdue = (task: TaskWithExpand) => {
    if (!task.due_date || task.status === 'completed' || task.status === 'cancelled') return false;
    return new Date(task.due_date) < new Date();
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{t('tasks.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('tasks.description')}</p>
          </div>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {t('tasks.newTask')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('tasks.stats.total')}</CardDescription>
            <CardTitle className="text-3xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('tasks.stats.pending')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Clock className="h-6 w-6 text-yellow-500" />
              {stats.pending}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('tasks.stats.overdue')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              {stats.overdue}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>{t('tasks.stats.completed')}</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              {stats.completed}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('tasks.listTitle')}</CardTitle>
          <div className="flex items-center gap-4 mt-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredTasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t('common.noData')}</p>
          ) : (
            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className={`flex items-center gap-4 p-4 border rounded-lg ${
                    isOverdue(task) ? 'border-red-200 bg-red-50' : ''
                  }`}
                >
                  <Checkbox
                    checked={task.status === 'completed'}
                    disabled={task.status === 'completed' || isMutating}
                    onCheckedChange={() => handleComplete(task.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                        {task.title}
                      </span>
                      <Badge className={PRIORITY_COLORS[task.priority]}>
                        {t(`tasks.priority.${task.priority}`)}
                      </Badge>
                      <Badge className={STATUS_COLORS[task.status]}>
                        {t(`tasks.status.${task.status}`)}
                      </Badge>
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mt-1 truncate">{task.description}</p>
                    )}
                  </div>
                  {task.due_date && (
                    <div className={`flex items-center gap-1 text-sm ${isOverdue(task) ? 'text-red-600' : 'text-muted-foreground'}`}>
                      <Calendar className="h-4 w-4" />
                      {task.due_date}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
