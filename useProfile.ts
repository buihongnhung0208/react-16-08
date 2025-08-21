import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getProfile, getProfilePhotos, setPhoto, deletePhotoApi } from "@/libs/api/profile";
import { ACCOUNT_QUERY_KEY } from "./useAccount";
import { useMemo } from "react";
import agent from "../api/agent";

const PROFILE_QUERY_KEY = {
  all: ["profiles"],
  profile: (id?: string) => [...PROFILE_QUERY_KEY.all, id],
  photos: (id?: string) => [...PROFILE_QUERY_KEY.profile(id), "photos"],
};

export const useProfile = (id?: string) => {
  const queryClient = useQueryClient();
  const user = queryClient.getQueryData<User>(ACCOUNT_QUERY_KEY.user());

  const { data: profile, isLoading: isLoadingProfile } = useQuery({
    queryKey: PROFILE_QUERY_KEY.profile(id as string),
    queryFn: () => getProfile(id as string),
    enabled: !!id,
  });

  const { data: photos, isLoading: isLoadingPhotos } = useQuery({
    queryKey: PROFILE_QUERY_KEY.photos(id as string),
    queryFn: () => getProfilePhotos(id as string),
    enabled: !!id,
  });

  const { mutateAsync: uploadPhoto, isPending: isUploadingPhoto } = useMutation(
    {
      mutationFn: async (file: Blob) => {
        const formData = new FormData();

        formData.append("file", file);
        const response = await agent.post<Photo>("/profiles/photo", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        return response.data;
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: PROFILE_QUERY_KEY.all,
        });
      },
    }
  );

  const { mutate: setMainPhoto, isPending: isSettingMainPhoto } = useMutation({
    mutationFn: async (id: string) => {
      const response = await setPhoto(id);
      return response.data;
    },
    onMutate: async (photoId: string) => {
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY.photos(id as string) });
      await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY.profile(id as string) });
      await queryClient.cancelQueries({ queryKey: ACCOUNT_QUERY_KEY.user() });

      const previousPhotos = queryClient.getQueryData<Photo[]>(
        PROFILE_QUERY_KEY.photos(id as string)
      );
      const previousProfile = queryClient.getQueryData<Profile>(
        PROFILE_QUERY_KEY.profile(id as string)
      );
      const previousUser = queryClient.getQueryData<User>(
        ACCOUNT_QUERY_KEY.user()
      );

      const updatedPhotos = previousPhotos?.map((p) => ({
        ...p,
        isMain: p.id === photoId,
      }));
      queryClient.setQueryData(PROFILE_QUERY_KEY.photos(id as string), updatedPhotos);

      const mainPhoto = updatedPhotos?.find((p) => p.isMain);
      if (previousProfile && mainPhoto) {
        queryClient.setQueryData(PROFILE_QUERY_KEY.profile(id as string), {
          ...previousProfile,
          imageUrl: mainPhoto.url,
        });
        queryClient.setQueryData(ACCOUNT_QUERY_KEY.user(), {
          ...previousUser,
          imageUrl: mainPhoto.url,
        });
      }

      return { previousPhotos, previousProfile, previousUser } as {
        previousPhotos?: Photo[];
        previousProfile?: Profile;
        previousUser?: User;
      };
    },
    onError: (_error, _photoId, context) => {
      queryClient.setQueryData(
        PROFILE_QUERY_KEY.photos(id as string),
        context?.previousPhotos
      );

      queryClient.setQueryData(
        PROFILE_QUERY_KEY.profile(id as string),
        context?.previousProfile
      );
      
      queryClient.setQueryData(
        ACCOUNT_QUERY_KEY.user(),
        context?.previousUser
      );

    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY.all }),
        queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEY.user() }),
      ]);
    },
  });

  const { mutateAsync: deletePhoto, isPending: isDeletingPhoto } = useMutation(
    {
      mutationFn: async (idPhoto: string) => {
        const response = await deletePhotoApi(idPhoto)
        return response.data;
      },
      onMutate: async (photoId: string) => {
        await queryClient.cancelQueries({ queryKey: PROFILE_QUERY_KEY.photos(id as string) })
        const previousPhotos = queryClient.getQueryData<Photo[]>(
          PROFILE_QUERY_KEY.photos(id as string)
        );
        const newPhotos = previousPhotos?.filter(photo => photo.id != photoId)
        queryClient.setQueryData(
          PROFILE_QUERY_KEY.photos(id as string), newPhotos
        );
        return { previousPhotos }
      },
      onError: (_error, _photoId, context) => {
        if (context?.previousPhotos) {
          queryClient.setQueryData(
            PROFILE_QUERY_KEY.photos(id as string),
            context.previousPhotos
          );
        }
      },
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: PROFILE_QUERY_KEY.photos(id as string),
        });
      },
    }
  );

  const isCurrentUser = useMemo(() => {
    if (!user || !profile) return false;
    return user?.id === profile?.id;
  }, [user, profile]);

  return {
    profile,
    isLoadingProfile,
    photos,
    isLoadingPhotos,
    isCurrentUser,
    uploadPhoto,
    isUploadingPhoto,
    setMainPhoto,
    isSettingMainPhoto,
    deletePhoto,
    isDeletingPhoto
  };
};
