import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { joinGroupSchema, type JoinGroupRequest } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Key } from 'lucide-react';

interface JoinGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

export function JoinGroupModal({ open, onOpenChange, sessionId }: JoinGroupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<JoinGroupRequest>({
    resolver: zodResolver(joinGroupSchema),
    defaultValues: {
      token: '',
      nickname: '',
    },
  });

  const joinGroupMutation = useMutation({
    mutationFn: async (data: JoinGroupRequest) => {
      const response = await apiRequest('POST', '/api/groups/join', data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "You've successfully joined the group.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: JoinGroupRequest) => {
    joinGroupMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader className="text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto mb-4 flex items-center justify-center">
            <Key className="text-primary text-xl" />
          </div>
          <DialogTitle className="text-xl font-semibold">Join Group</DialogTitle>
          <p className="text-sm text-gray-600">
            Enter the group token shared by an administrator
          </p>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="token"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Group Token</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="Enter 8-character token"
                      maxLength={8}
                      className="uppercase"
                      onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nickname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Nickname</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      placeholder="How others will see you"
                      maxLength={20}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex space-x-3 mt-6">
              <Button 
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                className="flex-1"
                disabled={joinGroupMutation.isPending}
              >
                {joinGroupMutation.isPending ? 'Joining...' : 'Join Group'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
