import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: {
        email: true,
        name: true,
        role: true,
        is_active: true,
      },
      take: 10,
    })

    console.log('\n📊 Users in database:')
    console.log('=====================')
    users.forEach(user => {
      console.log(`✓ ${user.name} (${user.email}) - ${user.role} - Active: ${user.is_active}`)
    })
    console.log(`\nTotal users found: ${users.length}`)

    // Try to verify the Super Admin password
    const admin = await prisma.user.findUnique({
      where: { email: 'admin@deriv.com' },
      select: {
        email: true,
        name: true,
        password_hash: true,
      },
    })

    if (admin) {
      console.log('\n✓ Super Admin found in database')
      console.log(`  Email: ${admin.email}`)
      console.log(`  Name: ${admin.name}`)
      console.log(`  Password hash exists: ${!!admin.password_hash}`)
      console.log(`  Hash starts with: ${admin.password_hash.substring(0, 10)}...`)
    } else {
      console.log('\n❌ Super Admin NOT found!')
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()
