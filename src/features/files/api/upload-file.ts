import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/Api-client";

export type FileRecord = {
  id: string;
  entity: string;
  entityId: string;
  filename: string;
  url: string;
  fileSize: number;
  uploadedBy: string | null;
  createdAt: string;
};

export type UploadFileInput = {
  file: File;
  /** Logical owner type, e.g. "User", "Product", "Document". */
  entity: string;
  /** Id of the owning entity. */
  entityId: string;
};

/**
 * Uploads a file to POST /api/files as multipart/form-data.
 * The backend reads the uploader from the JWT, so only file/entity/entityId are sent.
 */
export const uploadFile = async ({
  file,
  entity,
  entityId,
}: UploadFileInput): Promise<FileRecord> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("entity", entity);
  formData.append("entityId", entityId);

  const response = await api.post<FileRecord>("Files", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const useUploadFile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadFile,
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["files", data.entity, data.entityId],
      });
    },
  });
};

/** Fetch files associated with an owner entity. */
export const getFilesByEntity = async (
  entity: string,
  entityId: string
): Promise<FileRecord[]> => {
  const response = await api.get<FileRecord[]>("Files", {
    params: { entity, entityId },
  });
  return response.data;
};

/** Delete a file by id. */
export const deleteFile = async (id: string): Promise<void> => {
  await api.delete(`Files/${id}`);
};
