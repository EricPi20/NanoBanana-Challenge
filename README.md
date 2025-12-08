# Nano Banana Challenge 🍌

Ahoy! Welcome to the Nano Banana Challenge - a competitive AI image generation game where players create masterpieces and vote for the best!

## 🎮 How It Works

1. **Players Join**: Enter your name and choose an icon
2. **Admin Controls**: First player can claim admin (captain) role
3. **Three Rounds**: Easy, Medium, and Hard difficulty levels
4. **Head-to-Head**: Two random players compete each round
5. **Create & Upload**: Players create AI-generated images (3-minute timer)
6. **Vote**: Other players vote anonymously for their favorite
7. **Winner Advances**: Highest votes wins and advances to next round

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works great!)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up Supabase:**
   - Go to [Supabase](https://supabase.com) and create a free account
   - Create a new project
   - Get your project URL and anon key from Settings → API
   - Follow the detailed setup guide in `SUPABASE_SETUP.md`

3. **Configure environment variables:**
   Your `.env.local` file should contain:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open [http://localhost:3000](http://localhost:3000)** in your browser

## 📦 Deployment to Vercel

1. **Push your code to GitHub**

2. **Import project to Vercel:**
   - Go to [Vercel](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository

3. **Add environment variables:**
   - In Vercel project settings, add all the Firebase environment variables
   - Use the same variable names as in `.env.local`

4. **Deploy:**
   - Vercel will automatically deploy on push to main branch
   - Or click "Deploy" to deploy immediately

## 🎨 Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - PostgreSQL database with real-time subscriptions
- **Supabase Storage** - Image uploads
- **Vercel** - Hosting

## 📁 Project Structure

```
/app
  /page.tsx - Landing/join page
  /game/page.tsx - Main game interface
  /api/upload/route.ts - Image upload handler
/components
  /PlayerJoin.tsx - Player registration
  /AdminPanel.tsx - Admin controls
  /GameBoard.tsx - Main game component
  /VotingArea.tsx - Voting interface
  /Timer.tsx - Countdown timer
  /PlayerList.tsx - Player list display
/lib
  /firebase.ts - Firebase configuration
  /gameLogic.ts - Game state management
/types
  /game.ts - TypeScript interfaces
```

## 🎯 Game Flow

1. **Lobby**: Players join and wait
2. **Selecting Players**: Admin starts round, 2 players selected
3. **Creating**: 3-minute timer starts, players create and upload images
4. **Voting**: All players vote for best submission
5. **Results**: Winner declared and advances
6. **Next Round**: Process repeats for Medium and Hard rounds
7. **Game Over**: Final scores displayed

## 🔧 Supabase Setup

See `SUPABASE_SETUP.md` for detailed instructions on:
- Creating database tables
- Setting up storage bucket
- Enabling real-time subscriptions
- Configuring security policies

## 📝 License

MIT

## ⚓ Happy Gaming!

May the best banana artist win! 🍌🎨
