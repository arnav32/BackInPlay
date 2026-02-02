# BackInPlay 🏃‍♂️

**Project for IC Hack 2026** | Europe's Largest Student-Run Hackathon

An AI-powered physiotherapy assistant that provides personalised rehab plans, voice guidance, and real-time movement feedback for amateur athletes—without NHS waiting lists or expensive private physios.

## 🎯 The Problem

- NHS physiotherapy waiting lists exceed **2 months**
- Private physiotherapy costs **hundreds of pounds**
- Amateur athletes are left suffering in pain with limited affordable options
- Many injuries worsen due to delayed or inaccessible treatment

## 💡 Our Solution

BackInPlay is your pocket-sized digital physio, offering:

- **AI Voice Assistant**: Describe your condition naturally using ElevenLabs voice technology
- **Personalised Exercise Plans**: AI-generated rehabilitation programmes tailored to your specific injury
- **Real-Time Movement Feedback**: Computer vision tracking that monitors your form and provides instant corrections
- **Comprehensive Exercise Database**: Access to the full catalogue of physiotherapy exercises used by professionals
- **Accessible & Affordable**: Available anytime, anywhere, at a fraction of the cost

## 🛠️ Built With

- **[Claude](https://www.anthropic.com/claude)** - AI intelligence layer for exercise plan generation
- **[ElevenLabs](https://elevenlabs.io/)** - Natural voice interaction
- **[Google MediaPipe](https://google.github.io/mediapipe/)** - Computer vision for movement tracking
- **[Next.js](https://nextjs.org/)** - React framework
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe development

## 🚀 How It Works

1. **Describe Your Injury**: Chat with our AI physio assistant using natural voice conversation
2. **Receive Your Plan**: Get a personalised rehabilitation programme based on professional physiotherapy exercises
3. **Exercise with Guidance**: Follow along with voice instructions whilst our computer vision tracks your movements
4. **Get Real-Time Feedback**: Receive instant corrections to ensure proper form and prevent further injury

## 🏆 Challenges Overcome

### Data Access
Our biggest hurdle was finding a reliable source of professional physiotherapy exercises. We successfully integrated a comprehensive database containing all exercises prescribed by qualified physiotherapists.

### Architecture Evolution
We initially proposed an end-to-end ElevenLabs framework. However, we discovered limitations with incorporating real-time feedback into the ElevenLabs agent. We overcame this by implementing an additional LLM layer, creating a more robust and flexible architecture.

## 🎓 IC Hack 2026

This project was developed during IC Hack 2026, Europe's largest student-run hackathon, where we worked to solve real-world healthcare accessibility challenges.

## 📝 Licence

This project was created for IC Hack 2026.

---

**Made with ❤️ by the BackInPlay team**
