import { useMutation } from '@tanstack/react-query';
import { unsealDocument } from '../api/custody';

export function useUnseal(documentId: number) {
  return useMutation({
    mutationFn: (custodians: string[]) => unsealDocument(documentId, custodians),
  });
}
