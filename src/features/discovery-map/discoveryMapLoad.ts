export type DiscoveryMapStatus = 'loading' | 'ready' | 'failed';

export function createMapLoadTracker(onStatus: (status: DiscoveryMapStatus) => void) {
  const failedResources = new Set<string>();
  let hasRendered = false;
  let previousStatus: DiscoveryMapStatus = 'loading';

  function publish() {
    const status = failedResources.size > 0 ? 'failed' : hasRendered ? 'ready' : 'loading';
    if (status !== previousStatus) {
      previousStatus = status;
      onStatus(status);
    }
  }

  return {
    fail(resource: string) {
      failedResources.add(resource);
      publish();
    },
    recover(resource: string) {
      failedResources.delete(resource);
      publish();
    },
    resetViewport() {
      hasRendered = false;
      publish();
    },
    rendered() {
      hasRendered = true;
      publish();
    },
  };
}
