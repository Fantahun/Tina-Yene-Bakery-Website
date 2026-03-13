/** @type {{experimental: {workerThreads: boolean, cpus: number}, typescript: {ignoreBuildErrors: boolean}}} */
const nextConfig = {
    // this is added to make sure that the worker threads are not used in production, which can cause issues with some hosting providers due to process limits
    experimental:{
        workerThreads:false,
        cpus:1,
    }
  ,
  typescript: {
    ignoreBuildErrors: true,
  }
}

export default nextConfig
