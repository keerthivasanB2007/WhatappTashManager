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
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], tasks => (tasks || []).map(task => task.id === id ? { ...task, status } : task));
      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) queryClient.setQueryData(['tasks'], context.previousTasks);
    },
    // Skipping immediate invalidation to prevent "regenerate freshly" visual flashes until manual reload
    // onSettled: () => queryClient.invalidateQueries({ queryKey: ['tasks'] })
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => tasksApi.deleteTask(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['tasks'] });
      const previousTasks = queryClient.getQueryData(['tasks']);
      queryClient.setQueryData(['tasks'], tasks => (tasks || []).filter(task => task.id !== id));
      return { previousTasks };
    },
    onError: (_error, _variables, context) => {
      if (context?.previousTasks) queryClient.setQueryData(['tasks'], context.previousTasks);
    }
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
