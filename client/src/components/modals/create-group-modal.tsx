import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createGroupSchema, type CreateGroupRequest } from '@shared/schema';
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
import { PlusCircle, Copy } from 'lucide-react';

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateGroupModal({ open, onOpenChange }: CreateGroupModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createdGroup, setCreatedGroup] = useState<{ name: string; token: string } | null>(null);

  const form = useForm<CreateGroupRequest>({
    resolver: zodResolver(createGroupSchema),
    defaultValues: {
      name: '',
      nickname: '',
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: async (data: CreateGroupRequest) => {
      const response = await apiRequest('POST', '/api/groups/create', data);
      return response.json();
    },
    onSuccess: (data) => {
      setCreatedGroup(data.group);
      queryClient.invalidateQueries({ queryKey: ['/api/groups'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create group",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateGroupRequest) => {
    createGroupMutation.mutate(data);
  };

  const handleCopyToken = () => {
    if (createdGroup) {
      navigator.clipboard.writeText(createdGroup.token);
      toast({
        title: "Copied!",
        description: "Group token copied to clipboard",
      });
    }
  };

  const handleClose = () => {
    setCreatedGroup(null);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        {!createdGroup ? (
          <>
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <PlusCircle className="text-success text-xl" />
              </div>
              <DialogTitle className="text-xl font-semibold">Create Group</DialogTitle>
              <p className="text-sm text-gray-600">
                Create a new emergency group and invite others
              </p>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Group Name</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          placeholder="e.g., Family, Work Team"
                          maxLength={30}
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
                    className="flex-1 bg-success hover:bg-green-700"
                    disabled={createGroupMutation.isPending}
                  >
                    {createGroupMutation.isPending ? 'Creating...' : 'Create Group'}
                  </Button>
                </div>
              </form>
            </Form>
          </>
        ) : (
          <>
            <DialogHeader className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                <PlusCircle className="text-success text-xl" />
              </div>
              <DialogTitle className="text-xl font-semibold">Group Created!</DialogTitle>
              <p className="text-sm text-gray-600">
                Share this token with others to invite them
              </p>
            </DialogHeader>

            <div className="space-y-4">
              <div className="text-center">
                <div className="text-sm text-gray-600 mb-2">Group: {createdGroup.name}</div>
                <div className="bg-gray-100 p-4 rounded-lg">
                  <div className="text-2xl font-mono font-bold tracking-widest text-gray-900">
                    {createdGroup.token}
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleCopyToken}
                className="w-full"
                variant="outline"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Token
              </Button>

              <Button 
                onClick={handleClose}
                className="w-full bg-success hover:bg-green-700"
              >
                Done
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
