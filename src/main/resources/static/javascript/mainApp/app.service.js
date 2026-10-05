/* global UHGroupingsApp */
(() => {
    /**
     * Service function that provides GET and POST requests for getting or updating data
     * @name dataProvider
     */
    UHGroupingsApp.factory("dataProvider", function ($http, $rootScope, $timeout, $window, BASE_URL) {

        const delay = 5000;
        const timeLimit = 20000;
        const maxRetries = 3;
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
        const pollData = (jobId, callback, callError, timeoutPromise, onProgress) => {
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

        return {

            /**
             * Perform a GET request to the specified URL.
             * @param {string} arguments[0] - if provided it will be the URL to perform the request on
             * @param {function} arguments[1] - if provided it will be the function to perform on a successful request (200)
             * @param {function} arguments[2] - if provided it will execute if response returns as an error.
             */
            retrieveData() {
                switch (arguments.length) {
                    case 3:
                        $http.get(encodeURI(arguments[0]))
                            .then(arguments[1], arguments[2]);
                        break;
                    case 2:
                        $http.get(encodeURI(arguments[0]))
                            .then(arguments[1]);
                        break;
                    default:
                        // Ignore request.
                        break;
                }
            },

            /**
             * Perform a GET request to the specified URL.
             * @param {string} url - the URL to perform the request on
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             */
            loadData(url, callback, callError) {
                $http.get(encodeURI(url))
                    .then((response) => {
                        callback(response.data);
                    }, (response) => {
                        if (typeof callError === "function") {
                            callError(response);
                        }
                    });
            },

            /**
             * Perform a POST request to the specified URL.
             * @param {string} url - the URL to perform the request on
             * @param {any} data - the data to perform the request with
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             */
            loadDataWithBody(url, data, callback, callError) {
                $http.post(encodeURI(url), data)
                    .then((response) => {
                        callback(response.data);
                    }, (response) => {
                        callError(response);
                    });
            },

            /**
             * Perform a POST request to the specified async URL.
             * @param {string} url - the URL to perform the request on
             * @param {any} data - the data to perform the request with
             * @param {number} initialPoll - the milliseconds to wait before making the first poll
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             */
            loadDataWithBodyAsync(url, data, initialPoll, callback, callError) {
                $http.post(encodeURI(url), data)
                    .then((response) => {
                        $timeout(() => pollData(response.data, callback, callError), initialPoll);
                    }, (response) => {
                        callError(response);
                    });
            },

            /**
             * Perform a POST request to the specified URL that retries on error with incremental delay.
             * @param {string} url - the URL to perform the request on
             * @param {any} data - the data to perform the request with
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             * @param {number} retries - the number of retries to attempt
             */
            loadDataWithBodyRetry(url, data, callback, callError, retries = maxRetries) {
                $http.post(encodeURI(url), data)
                    .then((response) => callback(response.data))
                    .catch((response) => {
                        if (retries <= 0) {
                            callError(response);
                            return;
                        }
                        $timeout(
                            () => this.loadDataWithBodyRetry(url, data, callback, callError, retries - 1),
                            2000 * Math.log(maxRetries / retries)
                        );
                    });
            },

            /**
             * Perform a POST request to the specified URL.
             * @param {string} url - the URL to perform the request on
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             */
            updateData(url, callback, callError) {
                $http.post(encodeURI(url))
                    .then((response) => {
                        callback(response.data);
                    }, (response) => {
                        callError(response);
                    });
            },

            /**
             * Perform a POST request to the specified async URL.
             * @param {string} url - the URL to perform the request on
             * @param {number} initialPoll - the milliseconds to wait before making the first poll
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - Execute if response returns as an error.
             */
            updateDataAsync(url, initialPoll, callback, callError) {
                $http.post(encodeURI(url))
                    .then((response) => {
                        $timeout(() => pollData(response.data, callback, callError), initialPoll);
                    }, (response) => {
                        callError(response);
                    });
            },

            /**
             * Perform a PUT request to the specified URL.
             * @param {string} url - the URL to perform the request on
             * @param {string} data - data to be updated
             * @param {function} callback - the function to perform on a successful request (200)
             * @param {function} callError - the function to perform on a unsuccessful request
             */
            updateDataWithBody(url, data, callback, callError) {
                $http.put(encodeURI(url), data)
                    .then((response) => {
                        callback(response.data);
                    }, (response) => {
                        callError(response);
                    });
            },

            /**
             * PUT data to the server, if the response is OK then call the callBack function, if the response is an
             * error then call the callError function. If the response is not received in n seconds, display a modal.
             * @param {string} url - Path to which data is being posted too.
             * @param {any} data - data to be updated
             * @param {function} modal - Display a modal using a call back function.
             * @param {function} callback - Execute if response returns OK
             * @param {function} callError - Execute if response returns as an error.
             */
            updateDataWithBodyAndTimeoutModal(url, data, callback, callError, modal) {
                let timeoutPromise = $timeout(modal, timeLimit);
                $http.put(encodeURI(url), data)
                    .then((response) => {
                        $timeout.cancel(timeoutPromise)
                        callback(response.data);
                    }, (response) => {
                        $timeout.cancel(timeoutPromise)
                        callError(response);
                    });
            },

            /**
             * PUT data to the server asynchronously, if the response is OK then call the callBack function, if the response is an
             * error then call the callError function. If the response is not received in n seconds, display a modal.
             * @param {string} url - Path to which data is being posted too.
             * @param {any} data - data to be updated
             * @param {number} initialPoll - the milliseconds to wait before making the first poll
             * @param {function} modal - Display a modal using a call back function.
             * @param {function} callback - Execute if response returns OK
             * @param {function} callError - Execute if response returns as an error.
             * @param {function} [onProgress] - Called with the job's progress each time it is polled (see pollData).
             */
            updateDataWithBodyAndTimeoutModalAsync(url, data, initialPoll, callback, callError, modal, onProgress) {
                let timeoutPromise = $timeout(modal, timeLimit);
                $http.put(encodeURI(url), data)
                    .then((response) => {
                        $timeout(() => pollData(response.data, callback, callError, timeoutPromise, onProgress),
                            initialPoll);
                    }, (response) => {
                        callError(response);
                        $timeout.cancel(timeoutPromise)
                    });
            },

            /**
             * Handle Java exceptions by performing a POST request.
             * @param {object} exceptionData - an object containing the exception (stored as a string)
             * @param {string} url - the endpoint to perform the POST request
             * @param {string} redirectUrl - the location to redirect after
             */
            handleException(exceptionData, url, redirectUrl) {
                $http.post(encodeURI(url), exceptionData, {
                    headers: {
                        "Content-Type": "application/json"
                    }
                })
                    .then(() => {
                        $window.location.href = redirectUrl;
                    });
            },
        };
    });
})();
