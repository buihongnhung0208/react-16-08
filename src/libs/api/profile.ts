import agent from "./agent";

export const getProfile = async (id: string) => {
  const response = await agent.get<Profile>(`/profiles/${id}`);
  return response.data;
};

export const getProfilePhotos = async (id: string) => {
  const response = await agent.get<Photo[]>(`/profiles/${id}/photos`);
  return response.data;
};

export const setPhoto = async (id: string) => {
  const response = await agent.put(`/profiles/photo/${id}/main`);
  return response.data;
};

export const deletePhotoApi = async (id: string) => {
  const response = await agent.delete(`/profiles/photo/${id}`);
  return response.data;
};
