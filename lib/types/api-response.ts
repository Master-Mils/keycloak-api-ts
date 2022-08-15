type ApiResponse<T> = {
  success: boolean;
  data: T;
};

export default ApiResponse;