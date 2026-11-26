export function createBuilderFormOnce(requestRef, createRequest) {
  if (requestRef.current) return requestRef.current;

  const request = createRequest();
  requestRef.current = request;

  const clearIfCurrent = () => {
    if (requestRef.current === request) requestRef.current = null;
  };
  request.then(clearIfCurrent, clearIfCurrent);

  return request;
}
