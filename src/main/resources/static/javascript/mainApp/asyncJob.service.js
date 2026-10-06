/* global UHGroupingsApp */
(() => {
    /**
     * Service function that polls an async job of the groupings API until it has completed with a result. It returns
     * the function that does the polling.
     * @name asyncJobPoller
     */
    UHGroupingsApp.factory("asyncJobPoller", function ($http, $rootScope, $timeout, BASE_URL) {

        const delay = 5000;
        // The polls of an async job in a row that may go unanswered (a minute's worth) before the polling fails.
        const maxPollsUnanswered = 12;

        /**
         * Polls to getAsyncJobResult API endpoint until the async job has completed with a result. Each poll of a job
         * that is in progress or completed is broadcast as "asyncJobPolled", so the idle timeout (TimeoutJsController)
         * doesn't log out a user who is waiting on a job such as a large import. A job the API no longer has (e.g.
         * because the API restarted) can never complete, so it fails like an unsuccessful request, with status 404.
         * A poll that gets no answer at all (status -1, e.g. the network dropped for a moment) is sent again, up to
         * maxPollsUnanswered times in a row, since the job runs on regardless; any other failure ends the polling.
         * @param {number} jobId - the jobId returned from the response of an async endpoint
         * @param {function} callback - the function to perform on a successful request (200)
         * @param {function} callError - execute if response returns as an error
         * @param {Promise} [timeoutPromise] - the $timeout promise of a slow-request modal, cancelled once the job
         * has completed or polling has failed
         * @param {function} [onProgress] - called with the progress ({phase, done, total}) of a job in progress that
         * reports it
         */
        return (jobId, callback, callError, timeoutPromise, onProgress) => {
            let unanswered = 0; // The polls in a row that have gone unanswered
            const poll = () => {
                $http.get(encodeURI(`${BASE_URL}jobs/${jobId}`))
                    .then((response) => {
                        unanswered = 0;
                        const status = response.data?.status;
                        if (status === "IN_PROGRESS") {
                            $rootScope.$broadcast("asyncJobPolled");
                            if (typeof onProgress === "function" && response.data.progress) {
                                onProgress(response.data.progress);
                            }
                            $timeout(poll, delay);
                            return;
                        }
                        $timeout.cancel(timeoutPromise);
                        if (status === "COMPLETED") {
                            $rootScope.$broadcast("asyncJobPolled");
                            callback(response.data.result);
                        } else {
                            callError({ ...response, status: 404 });
                        }
                    }, (response) => {
                        if (response.status <= 0 && unanswered < maxPollsUnanswered) {
                            unanswered++;
                            $timeout(poll, delay);
                            return;
                        }
                        $timeout.cancel(timeoutPromise);
                        callError(response);
                    });
            };
            poll();
        };
    });
})();
