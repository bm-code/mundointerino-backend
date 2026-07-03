import * as dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function main() {
  const userId = process.argv[2]

  if (!userId) {
    console.error('Uso: npx ts-node scripts/promote-admin.ts <USER_ID>')
    process.exit(1)
  }

  await mongoose.connect(process.env.MONGO_URI!)

  const result = await mongoose.connection.db!
    .collection('usuarios')
    .updateOne(
      { _id: new mongoose.Types.ObjectId(userId) },
      { $set: { rol: 'admin' } },
    )

  if (result.matchedCount > 0) {
    console.log(`Usuario ${userId} promocionado a admin.`)
  } else {
    console.log(`Usuario ${userId} no encontrado.`)
  }

  await mongoose.disconnect()
}

main().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})