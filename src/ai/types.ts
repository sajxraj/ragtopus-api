export enum Role {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

const Role = {}

const User = {
  SYSTEM: Role.SYSTEM,
}
console.log({ User, Role })

export enum ABC {
  SYSTEM = 'system',
  USER = 'user',
  ASSISTANT = 'assistant',
}

const ABC = {}

console.log(ABC, User)
