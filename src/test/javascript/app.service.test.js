/* global inject */
describe("AppService", () => {

    beforeEach(module("UHGroupingsApp"));
    beforeEach(module("ngMockE2E"));

    let BASE_URL;
    let dp;
    let httpBackend;
    let onSuccess;
    let onError;
    let timeout;
    let initialPoll;
    let modal;

    beforeEach(inject((dataProvider, _$httpBackend_, _BASE_URL_, _$timeout_, _$window_) => {
        BASE_URL = _BASE_URL_;
        dp = dataProvider;
        httpBackend = _$httpBackend_;
        onSuccess = jasmine.createSpy("onSuccess");
        onError = jasmine.createSpy("onError");
        modal = jasmine.createSpy("modal");
        timeout = _$timeout_;
        initialPoll = 5000;
    }));

    it("should define dataProvider", () => {
        expect(dp).toBeDefined();
    });

    describe("loadData", () => {
        let endpoint;

        beforeEach(() => {
            endpoint = BASE_URL + "/";
        });

        it("should call onSuccess", () => {
            dp.loadData(endpoint, onSuccess, onError);

            httpBackend.expectGET(endpoint).respond(200, "hello");
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith("hello");
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError when callError is provided", () => {
            dp.loadData(endpoint, onSuccess, onError);

            httpBackend.expectGET(endpoint).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it("should not throw when callError is missing and the request fails", () => {
            const endpointWithoutErrorCallback = `${BASE_URL}missing-error-callback`;
            dp.loadData(endpointWithoutErrorCallback, onSuccess);

            httpBackend.expectGET(endpointWithoutErrorCallback).respond(500);

            expect(() => httpBackend.flush()).not.toThrow();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("loadDataWithBody", () => {
        let endpoint;
        const requestData = { key: "value" };

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.loadDataWithBody(endpoint, requestData, onSuccess, onError);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPOST(endpoint, requestData).respond(200, "hello");
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith("hello");
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPOST(endpoint, requestData).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    describe("loadDataWithBodyAsync", () => {
        let endpoint;
        const response = { key: 1 };
        const result = "result";

        beforeEach(() => {
            endpoint = BASE_URL;
            dp.loadDataWithBodyAsync(endpoint, response, initialPoll, onSuccess, onError);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPOST(endpoint, response).respond(200, 1);
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS" });
            timeout.flush();
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result });
            timeout.flush();
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith(result);
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPOST(encodeURI(endpoint), response).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    describe("loadDataWithBodyRetry", () => {
        let endpoint;
        const response = { key: 1 };
        const result = "result";
        const retries = 2;

        beforeEach(() => {
            endpoint = BASE_URL;
            dp.loadDataWithBodyRetry(endpoint, response, onSuccess, onError, retries);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPOST(encodeURI(endpoint), response).respond(200, 1);
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith(1);
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError and retry", () => {
            for (let i = 0; i < retries; i++) {
                httpBackend.expectPOST(encodeURI(endpoint), response).respond(500);
            }

            dp.loadDataWithBodyRetry(endpoint, response, onSuccess, onError, 0);
            httpBackend.flush();

            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalled();
        });

    });

    describe("updateData", () => {
        let endpoint;

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.updateData(endpoint, onSuccess, onError);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPOST(endpoint).respond(200, "hello");
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith("hello");
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPOST(endpoint).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });

    });

    describe("updateDataAsync", () => {
        let endpoint;
        const result = "result";

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.updateDataAsync(endpoint, initialPoll, onSuccess, onError);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPOST(encodeURI(endpoint)).respond(200, 1);
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS" });
            timeout.flush();
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result });
            timeout.flush();
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith(result);
            expect(onError).not.toHaveBeenCalled();

        });

        it("should call onError", () => {
            httpBackend.expectPOST(encodeURI(endpoint)).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
        });

    });

    describe("updateDataWithBody", () => {
        let endpoint;
        const requestData = { key: "value" };

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.updateDataWithBody(endpoint, requestData, onSuccess, onError);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPUT(encodeURI(endpoint), requestData).respond(200, "hello");
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPUT(encodeURI(endpoint), requestData).respond(500);
            httpBackend.flush();

            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalled();
        });
    });


    describe("updateDataWithBodyAndTimeoutModel", () => {
        let endpoint;
        const requestData = { key: "value" };

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.updateDataWithBodyAndTimeoutModal(endpoint, requestData, onSuccess, onError, modal);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPUT(endpoint, requestData).respond(200, "hello");
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith("hello");
            expect(onError).not.toHaveBeenCalled();
            expect(modal).not.toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPUT(endpoint, requestData).respond(500);
            httpBackend.flush();

            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalled();
            expect(modal).not.toHaveBeenCalled();
        });

        it("should call the modal on timeout", () => {
            httpBackend.expectPUT(endpoint, requestData).respond(200);
            timeout.flush();

            expect(modal).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("updateDataWithBodyAndTimeoutModalAsync", () => {
        let endpoint;
        const result = "result";

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            dp.updateDataWithBodyAndTimeoutModalAsync(endpoint, result, initialPoll, onSuccess, onError, modal);
        });

        it("should call onSuccess", () => {
            httpBackend.expectPUT(endpoint, result).respond(200, 1);
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS" });
            timeout.flush();
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result });
            timeout.flush();
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith(result);
            expect(onError).not.toHaveBeenCalled();
            expect(modal).toHaveBeenCalled();
        });

        it("should call onError", () => {
            httpBackend.expectPUT(endpoint, result).respond(500);
            httpBackend.flush();

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(modal).not.toHaveBeenCalled();
        });

        it("should not call the modal when the job completes before the time limit", () => {
            httpBackend.expectPUT(endpoint, result).respond(200, 1);
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result });
            timeout.flush(initialPoll);
            httpBackend.flush();
            timeout.flush(20000);

            expect(onSuccess).toHaveBeenCalledWith(result);
            expect(modal).not.toHaveBeenCalled();
        });

        it("should not call the modal when polling fails before the time limit", () => {
            httpBackend.expectPUT(endpoint, result).respond(200, 1);
            httpBackend.flush();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(503);
            timeout.flush(initialPoll);
            httpBackend.flush();
            timeout.flush(20000);

            expect(onError).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(modal).not.toHaveBeenCalled();
        });

        it("should call the modal on timeout", () => {
            httpBackend.expectPUT(endpoint, result).respond(200);
            timeout.flush();

            expect(modal).toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("polling an async job", () => {
        let endpoint;
        let jobPolled;

        beforeEach(inject(($rootScope) => {
            endpoint = BASE_URL + "/";
            jobPolled = jasmine.createSpy("jobPolled");
            $rootScope.$on("asyncJobPolled", jobPolled);
            dp.updateDataWithBodyAndTimeoutModalAsync(endpoint, "data", initialPoll, onSuccess, onError, modal);
            httpBackend.expectPUT(endpoint, "data").respond(200, 1);
            httpBackend.flush();
        }));

        it("should broadcast asyncJobPolled for each answered poll, so the idle timeout does not log the user out", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS" });
            timeout.flush(initialPoll);
            httpBackend.flush();
            expect(jobPolled).toHaveBeenCalledTimes(1);

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result: "result" });
            timeout.flush(5000);
            httpBackend.flush();
            expect(jobPolled).toHaveBeenCalledTimes(2);
        });

        it("should not broadcast asyncJobPolled when a poll fails", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(503);
            timeout.flush(initialPoll);
            httpBackend.flush();

            expect(jobPolled).not.toHaveBeenCalled();
            expect(onError).toHaveBeenCalled();
        });

        it("should fail with status 404, and stop polling, when the API no longer has the job", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { id: 1, status: "NOT_FOUND", result: "" });
            timeout.flush(initialPoll);
            httpBackend.flush();
            timeout.flush(20000);

            httpBackend.verifyNoOutstandingRequest();
            expect(onError).toHaveBeenCalledWith(jasmine.objectContaining({ status: 404 }));
            expect(onSuccess).not.toHaveBeenCalled();
            expect(jobPolled).not.toHaveBeenCalled();
            expect(modal).not.toHaveBeenCalled();
        });

        it("should poll again after a poll that got no answer, since the job runs on", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
            timeout.flush(initialPoll);
            httpBackend.flush();
            expect(onError).not.toHaveBeenCalled();

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result: "result" });
            timeout.flush(5000);
            httpBackend.flush();

            expect(onSuccess).toHaveBeenCalledWith("result");
            expect(onError).not.toHaveBeenCalled();
        });

        it("should fail once a minute of polls in a row got no answer", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
            timeout.flush(initialPoll);
            httpBackend.flush();
            for (let poll = 1; poll <= 12; poll++) {
                expect(onError).not.toHaveBeenCalled();
                httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
                timeout.flush(5000);
                httpBackend.flush();
            }

            expect(onError).toHaveBeenCalledTimes(1);
            expect(onError).toHaveBeenCalledWith(jasmine.objectContaining({ status: -1 }));
            timeout.flush(20000);
            httpBackend.verifyNoOutstandingRequest();
        });

        it("should count only the polls in a row that got no answer", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
            timeout.flush(initialPoll);
            httpBackend.flush();
            for (let poll = 1; poll <= 11; poll++) {
                httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
                timeout.flush(5000);
                httpBackend.flush();
            }
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS" });
            timeout.flush(5000);
            httpBackend.flush();
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(-1);
            timeout.flush(5000);
            httpBackend.flush();

            expect(onError).not.toHaveBeenCalled();
        });
    });

    describe("polling the progress of an async job", () => {
        let endpoint;
        let onProgress;

        beforeEach(() => {
            endpoint = BASE_URL + "/";
            onProgress = jasmine.createSpy("onProgress");
            dp.updateDataWithBodyAndTimeoutModalAsync(endpoint, "data", initialPoll, onSuccess, onError, modal,
                onProgress);
            httpBackend.expectPUT(endpoint, "data").respond(200, 1);
            httpBackend.flush();
        });

        it("should pass on the progress of each poll of a job in progress", () => {
            const validating = { phase: "VALIDATING", done: 1000, total: 12412 };
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS", progress: validating });
            timeout.flush(initialPoll);
            httpBackend.flush();
            expect(onProgress).toHaveBeenCalledWith(validating);

            const adding = { phase: "ADDING", done: 250, total: 12284 };
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS", progress: adding });
            timeout.flush(5000);
            httpBackend.flush();
            expect(onProgress).toHaveBeenCalledWith(adding);

            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result: "result" });
            timeout.flush(5000);
            httpBackend.flush();
            expect(onProgress).toHaveBeenCalledTimes(2);
            expect(onSuccess).toHaveBeenCalledWith("result");
        });

        it("should not pass on progress that a job in progress does not report", () => {
            httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "IN_PROGRESS", progress: null });
            timeout.flush(initialPoll);
            httpBackend.flush();

            expect(onProgress).not.toHaveBeenCalled();
        });
    });

    it("should poll a job that reports progress without a progress callback", () => {
        dp.updateDataWithBodyAndTimeoutModalAsync(BASE_URL + "/", "data", initialPoll, onSuccess, onError, modal);
        httpBackend.expectPUT(BASE_URL + "/", "data").respond(200, 1);
        httpBackend.flush();

        httpBackend.expectGET(`${BASE_URL}jobs/1`)
            .respond(200, { status: "IN_PROGRESS", progress: { phase: "ADDING", done: 0, total: 1 } });
        timeout.flush(initialPoll);
        httpBackend.flush();
        httpBackend.expectGET(`${BASE_URL}jobs/1`).respond(200, { status: "COMPLETED", result: "result" });
        timeout.flush(5000);
        httpBackend.flush();

        expect(onSuccess).toHaveBeenCalledWith("result");
    });
});
