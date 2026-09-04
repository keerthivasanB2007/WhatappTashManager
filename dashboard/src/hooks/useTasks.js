import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as tasksApi from '../api/tasksApi';

export function useTasks() {
  const queryClient = useQueryClient();

  const { data: globalTasks = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => tasksApi.fetchTasks().then(res => res.tasks || []),
    staleTime: 5 * 60 * 1000 // 5 minute cache avoids aggressive API thrashing
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => tasksApi.updateTaskStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tasksApi.deleteTask(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  return {
    globalTasks,
    isLoading,
    isError,
    refetch,
    updateStatus: updateStatusMutation.mutateAsync,
    deleteTask: deleteMutation.mutateAsync
  };
}
