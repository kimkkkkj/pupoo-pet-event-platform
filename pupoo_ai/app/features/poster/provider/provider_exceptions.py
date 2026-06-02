class PosterProviderError(Exception):
    def __init__(
        self,
        message: str,
        *,
        provider: str | None = None,
        cause: Exception | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.provider = provider
        self.cause = cause


class PosterProviderTimeoutError(PosterProviderError):
    pass


class PosterProviderUnavailableError(PosterProviderError):
    pass


class PosterProviderResponseError(PosterProviderError):
    pass
