class ApiError extends Error {
  status: number
  message: string
  payload?: unknown
  errors?: unknown[]

  constructor(status: number = 500, message: string = 'Something went wrong', payload?: unknown, errors?: unknown[]) {
    super(message)
    this.status = status
    this.message = message
    this.payload = payload
    this.errors = errors
  }
}

export default ApiError
