import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously } from "firebase/auth";

// --- Configuration Firebase ---
// Vos clés personnelles sont maintenant intégrées.
const firebaseConfig = {
  apiKey: "AIzaSyBPYQ71AD6UcMBUsOPzAPO0cGP_6vSD180",
  authDomain: "leadqualify-quiz.firebaseapp.com",
  projectId: "leadqualify-quiz",
  storageBucket: "leadqualify-quiz.firebasestorage.app",
  messagingSenderId: "254277095540",
  appId: "1:254277095540:web:16db3779b724abbe264121",
  measurementId: "G-8EY3HZT3E3"
};

// --- Initialisation de Firebase ---
let app;
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "VOTRE_API_KEY") {
    app = initializeApp(firebaseConfig);
} else {
    console.error("Firebase config is missing or invalid. Please replace placeholder values.");
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;


// --- Données des Quiz ---
const quizzesData = {
  "salon-seniors-2024": {
    title: "Quiz du Salon des Seniors 2024",
    questions: [
        { text: "Pour vous, un escalier c'est plutôt...", answers: [{ text: "Un défi sportif quotidien", points: 3 }, { text: "Un simple passage", points: 1 }, { text: "Une source d'inquiétude", points: 2 }, { text: "Le mont Everest", points: 3 }] },
        { text: "Votre salle de bain idéale ressemble à...", answers: [{ text: "Un spa de luxe avec plein de recoins", points: 1 }, { text: "Un espace ouvert et sécurisé", points: 3 }, { text: "Ce qu'elle est aujourd'hui", points: 0 }, { text: "Une cabine de douche rapide", points: 2 }] },
        { text: "Le soir, vous êtes plutôt du genre...", answers: [{ text: "Netflix & plaid douillet", points: 2 }, { text: "Bricolage et jardinage", points: 1 }, { text: "Sortie au restaurant", points: 0 }, { text: "À vous coucher avec les poules", points: 3 }] },
    ]
  },
  "salon-bien-etre-2025": {
    title: "Quiz du Salon Bien-Être 2025",
    questions: [
        { text: "Votre programme TV idéal pour une soirée parfaite ?", answers: [{ text: "Un film d'action qui décoiffe !", points: 0 }, { text: "Un bon documentaire sur la nature.", points: 1 }, { text: "Une émission de rénovation pour piquer des idées.", points: 2 }, { text: "Une série réconfortante sous un plaid.", points: 3 }] },
        { text: "Si vous pouviez avoir un bouton magique pour votre maison, il servirait à...", answers: [{ text: "Faire le ménage instantanément.", points: 1 }, { text: "Aplanir les escaliers le temps de passer.", points: 3 }, { text: "Remplir le frigo automatiquement.", points: 0 }, { text: "Changer la déco d'un claquement de doigts.", points: 1 }] },
        { text: "Quel est votre plus grand 'ennemi' domestique ?", answers: [{ text: "La poussière qui revient toujours.", points: 1 }, { text: "Ce tapis sur lequel on trébuche.", points: 3 }, { text: "Le manque de rangement.", points: 2 }, { text: "Une connexion Wi-Fi capricieuse.", points: 0 }] },
        { text: "Le jardinage pour vous, c'est...", answers: [{ text: "Une passion ! J'y passe des heures.", points: 1 }, { text: "J'adore, mais mon dos un peu moins...", points: 3 }, { text: "Très peu pour moi, je préfère le balcon.", points: 2 }, { text: "Je n'ai pas la main verte.", points: 0 }] },
        { text: "Votre agilité personnelle se compare à celle...", answers: [{ text: "D'un super-héros Marvel.", points: 0 }, { text: "D'un chat qui fait une longue sieste.", points: 2 }, { text: "D'un sage chêne centenaire.", points: 3 }, { text: "D'un danseur de salsa.", points: 0 }] },
        { text: "Remonter les courses du supermarché, c'est...", answers: [{ text: "Facile, je fais ça en un seul voyage !", points: 0 }, { text: "Ma séance de musculation de la semaine.", points: 3 }, { text: "L'occasion de faire plusieurs petites pauses.", points: 2 }, { text: "Je me fais livrer, c'est plus simple.", points: 1 }] },
        { text: "Dans votre salle de bain, le sol est-il parfois une patinoire ?", answers: [{ text: "Jamais, j'ai des chaussons antidérapants.", points: 1 }, { text: "Seulement après la douche, c'est le water-polo !", points: 3 }, { text: "Non, j'ai un tapis de bain très absorbant.", points: 2 }, { text: "Je suis toujours très prudent.", points: 2 }] },
        { text: "Pour vous, la maison de vos rêves dans 10 ans est...", answers: [{ text: "Exactement la même qu'aujourd'hui.", points: 1 }, { text: "Un appartement plus simple à entretenir.", points: 2 }, { text: "Une maison de plain-pied, pratique et ouverte.", points: 3 }, { text: "Une cabane au Canada !", points: 0 }] },
        { text: "Se lever la nuit pour aller aux toilettes, c'est une mission...", answers: [{ text: "Commandos : je connais le chemin par cœur dans le noir.", points: 1 }, { text: "Illumination : j'allume tout sur mon passage.", points: 2 }, { text: "Exploration : je tâte les murs pour me guider.", points: 3 }, { text: "Impossible : je n'y vais jamais la nuit.", points: 0 }] },
        { text: "Si vous pouviez améliorer une seule chose dans votre maison demain, ce serait...", answers: [{ text: "La couleur des murs du salon.", points: 0 }, { text: "Agrandir la cuisine pour recevoir.", points: 1 }, { text: "Rendre la salle de bain plus accessible.", points: 3 }, { text: "Installer un meilleur système de son.", points: 0 }] },
    ]
  }
};

// --- Fonctions Utilitaires ---
const getLevelInfo = (score) => {
  if (score <= 10) return { name: "Hors cible", hasWon: false, gift: null };
  if (score <= 16) return { name: "Lead faible", hasWon: false, gift: null };
  if (score <= 23) return { name: "Lead moyen", hasWon: true, gift: "Réduction 5%" };
  return { name: "Lead fort", hasWon: true, gift: "Diagnostic gratuit" };
};

// --- FONCTION CSV CORRIGÉE ET SÉCURISÉE ---
const downloadCSV = (data, franchiseId) => {
  console.log("Tentative d'export CSV pour le franchisé:", franchiseId);
  console.log("Données reçues pour l'export :", data);

  if (!data || data.length === 0) {
    console.warn("Export annulé : Aucune donnée de lead à exporter.");
    // On pourrait afficher un message à l'utilisateur ici si nécessaire
    return;
  }

  const headers = ["Prénom", "Nom", "Email", "Téléphone", "Score", "Niveau", "Cadeau", "Date"];
  const rows = data.map(lead => [
    `"${lead.firstName || ''}"`,
    `"${lead.lastName || ''}"`,
    `"${lead.email || ''}"`,
    `"${lead.phone || ''}"`,
    lead.score,
    `"${lead.level || ''}"`,
    `"${lead.gift || 'Aucun'}"`,
    `"${new Date(lead.createdAt.seconds * 1000).toLocaleString('fr-FR')}"`
  ]);

  let csvContent = headers.join(';') + '\n';
  rows.forEach(rowArray => {
    let row = rowArray.join(';');
    csvContent += row + '\n';
  });

  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute("download", `leads_${franchiseId}_${date}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};


// --- Composants de l'UI ---

const WelcomeScreen = ({ onStart }) => (
  <div className="text-center p-4">
    <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-[0_0_10px_rgba(192,132,252,0.8)]">
      Bienvenue au Quiz Confort
    </h1>
    <p className="mt-4 text-lg text-gray-300">Prêt à relever le défi et découvrir une surprise ?</p>
    <button 
      onClick={onStart} 
      className="mt-12 bg-violet-600 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:bg-violet-500 transition-all duration-300 transform hover:scale-105 text-2xl shadow-[0_0_20px_rgba(192,132,252,0.6)] border-2 border-violet-400"
    >
      Commencer
    </button>
  </div>
);

const QuizScreen = ({ quiz, onQuizComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleAnswer = (points) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setScore(score + points);
    setTimeout(() => {
        if (currentQuestionIndex < quiz.questions.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            onQuizComplete(score + points);
        }
        setIsAnimating(false);
    }, 500);
  };

  const currentQuestion = quiz.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

  return (
    <div className={`w-full max-w-2xl mx-auto transition-opacity duration-500 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
      <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
        <div className="bg-violet-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
      </div>
      <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
        <h2 className="text-2xl md:text-3xl font-bold text-center text-white">{currentQuestion.text}</h2>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.answers.map((answer, index) => (
            <button
              key={index}
              onClick={() => handleAnswer(answer.points)}
              className="w-full bg-gray-900 border-2 border-violet-500 text-violet-300 font-semibold py-4 px-6 rounded-lg hover:bg-violet-500 hover:text-white hover:border-violet-300 transition-all duration-300 text-lg transform hover:scale-105"
            >
              {answer.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const LeadFormScreen = ({ score, onSubmit, onRestart }) => {
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', phone: '' });
  const levelInfo = getLevelInfo(score);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({ ...formData, score, level: levelInfo.name, gift: levelInfo.gift });
  };

  return (
    <div className="w-full max-w-md mx-auto text-center">
        <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700">
            <h2 className="text-3xl font-bold text-white">Résultat du Quiz</h2>
            <p className="mt-2 text-lg text-gray-300">Votre score final est de <span className="font-bold text-violet-400 text-2xl">{score}</span> points.</p>
            
            <div className="my-6 p-4 bg-gray-900/70 border border-violet-500 rounded-lg">
                {levelInfo.hasWon ? (
                    <p className="text-violet-300 font-semibold text-lg">
                        🎁 Bravo ! Vous avez gagné un petit cadeau !
                    </p>
                ) : (
                    <p className="text-gray-300 text-lg">
                        Merci d'avoir participé !
                    </p>
                )}
            </div>
            
            <p className="text-gray-400 mb-6">Pour recevoir votre cadeau (si applicable) et nos actualités, laissez-nous vos coordonnées :</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <input type="text" name="firstName" placeholder="Prénom" onChange={handleChange} required className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white" />
                <input type="text" name="lastName" placeholder="Nom" onChange={handleChange} required className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white" />
                <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white" />
                <input type="tel" name="phone" placeholder="Téléphone" onChange={handleChange} required className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 text-white" />
                <button type="submit" className="w-full bg-violet-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-violet-500 transition-all transform hover:scale-105 shadow-[0_0_15px_rgba(192,132,252,0.5)] border border-violet-400">
                    Valider
                </button>
            </form>
        </div>
        <button onClick={onRestart} className="mt-6 text-gray-400 hover:text-violet-300 transition-colors">Recommencer un autre quiz</button>
    </div>
  );
};

const SuccessScreen = ({ onRestart }) => (
  <div className="text-center p-4 flex flex-col items-center animate-fade-in">
    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center">
      <svg className="w-16 h-16 text-green-400 animate-checkmark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    </div>
    <h1 className="text-4xl font-bold text-white mt-6 drop-shadow-[0_0_10px_rgba(100,255,150,0.8)]">
      Succès !
    </h1>
    <p className="mt-2 text-xl text-gray-300">Vos informations ont bien été envoyées.</p>
    <button onClick={onRestart} className="mt-12 bg-violet-600 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:bg-violet-500 transition-all duration-300 transform hover:scale-105 text-2xl shadow-[0_0_20px_rgba(192,132,252,0.6)] border-2 border-violet-400">
      Nouveau Quiz
    </button>
  </div>
);

const FranchiseLoginScreen = ({ onLogin, onBack, franchiseId, quizId }) => {
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (pin === '1234') { // PIN en dur pour la démo
            onLogin();
        } else {
            setError('Code PIN incorrect.');
            setPin('');
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto">
            <button onClick={() => onBack(franchiseId, quizId)} className="absolute top-4 left-4 text-gray-400 hover:text-violet-300 transition-colors">
                &larr; Retour au quiz
            </button>
            <div className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700 text-center">
                <h2 className="text-2xl font-bold text-white">Accès Franchisé</h2>
                <form onSubmit={handleSubmit} className="mt-6">
                    <input 
                        type="password" 
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        placeholder="••••"
                        maxLength="4"
                        className="w-full text-center text-3xl tracking-[1rem] px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 text-white"
                    />
                    {error && <p className="text-red-400 mt-2">{error}</p>}
                    <button type="submit" className="mt-6 w-full bg-violet-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-violet-500 transition-all transform hover:scale-105">
                        Se connecter
                    </button>
                </form>
            </div>
        </div>
    );
};

const DashboardScreen = ({ franchiseId, onLogout }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!franchiseId || !db) return;
        console.log(`Mise en écoute des leads pour le franchisé : ${franchiseId}`);
        const q = query(collection(db, "leads"), where("franchiseId", "==", franchiseId));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Données reçues de Firebase :", leadsData);
            leadsData.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
            setLeads(leadsData);
            setLoading(false);
        }, (error) => {
            console.error("Erreur de lecture des leads depuis Firebase: ", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [franchiseId]);

    return (
        <div className="w-full max-w-7xl mx-auto p-4"> {/* Tableau de bord élargi */}
            <div className="flex justify-between items-center mb-8"> {/* Espace ajouté ici */}
                <h1 className="text-3xl font-bold text-white">Dashboard <span className="text-violet-400">{franchiseId}</span></h1>
                <div>
                    <button onClick={() => downloadCSV(leads, franchiseId)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-500 mr-4 transition-colors">
                        Exporter en CSV
                    </button>
                    <button onClick={onLogout} className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-500 transition-colors">
                        Déconnexion
                    </button>
                </div>
            </div>
            <div className="bg-gray-800/50 backdrop-blur-sm p-6 rounded-xl shadow-2xl border border-gray-700">
                {loading ? <p className="text-white">Chargement des leads depuis Firebase...</p> : leads.length === 0 ? (
                    <div className="text-center text-white py-8">
                        <h3 className="text-xl font-bold">Aucun lead trouvé pour "{franchiseId}"</h3>
                        <p className="mt-2 text-gray-400">Pour voir des données ici, veuillez compléter un quiz en utilisant une URL avec cet identifiant de franchisé.</p>
                        <p className="mt-1 text-gray-500 text-sm">Exemple : /quiz/{franchiseId}/salon-bien-etre-2025</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-gray-300">
                            <thead className="text-violet-300">
                                <tr className="border-b border-gray-700">
                                    <th className="p-3">Nom</th><th className="p-3">Contact</th><th className="p-3">Score</th><th className="p-3">Niveau (Interne)</th><th className="p-3">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leads.map(lead => (
                                    <tr key={lead.id} className="border-b border-gray-700 hover:bg-gray-900/50">
                                        <td className="p-3">{lead.firstName} {lead.lastName}</td>
                                        <td className="p-3">{lead.email}<br/>{lead.phone}</td>
                                        <td className="p-3 font-bold text-violet-400">{lead.score}</td>
                                        <td className="p-3 font-semibold">{lead.level}</td>
                                        <td className="p-3 text-sm text-gray-400">{new Date(lead.createdAt.seconds * 1000).toLocaleString('fr-FR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Composant Principal de l'Application ---
export default function App() {
  const [page, setPage] = useState('welcome');
  const [score, setScore] = useState(0);
  const [franchiseId, setFranchiseId] = useState(null);
  const [quizId, setQuizId] = useState(null);
  const [isFranchiseLoggedIn, setIsFranchiseLoggedIn] = useState(false);

  // Gère l'état de connexion et le routage au chargement
  useEffect(() => {
    // S'authentifie anonymement pour pouvoir écrire dans Firestore
    if (auth) {
        signInAnonymously(auth).catch(error => console.error("Anonymous auth failed", error));
    }
    
    const path = window.location.pathname.split('/').filter(p => p);
    const wasLoggedIn = sessionStorage.getItem('franchiseLoggedIn') === 'true';

    // Si l'URL est pour le dashboard
    if (path[0] === 'dashboard' && path[1]) {
        setFranchiseId(path[1]);
        if (wasLoggedIn) {
            setIsFranchiseLoggedIn(true);
            setPage('dashboard');
        } else {
            setPage('login');
        }
    // Si l'URL est pour un quiz
    } else if (path[0] === 'quiz' && path[1] && path[2]) {
        setFranchiseId(path[1]); 
        setQuizId(path[2]); 
        setPage('welcome');
    // URL par défaut
    } else {
        setFranchiseId('demo-franchise'); 
        setQuizId('salon-bien-etre-2025'); 
        setPage('welcome');
    }
  }, []);
  
  const selectedQuiz = useMemo(() => quizzesData[quizId] || quizzesData['salon-bien-etre-2025'], [quizId]);

  const handleStartQuiz = () => setPage('quiz');
  const handleQuizComplete = (finalScore) => { setScore(finalScore); setPage('form'); };
  const handleFormSubmit = async (leadData) => {
    if (!db) return;
    try {
      await addDoc(collection(db, "leads"), { ...leadData, franchiseId, quizId, createdAt: Timestamp.now() });
      setPage('success'); // Affiche la nouvelle page de succès
    } catch (e) { console.error("Erreur d'ajout du document: ", e); }
  };
  const handleRestart = () => { setScore(0); setPage('welcome'); };

  const handleLogin = () => { 
    sessionStorage.setItem('franchiseLoggedIn', 'true'); // Enregistre la session
    setIsFranchiseLoggedIn(true); 
    setPage('dashboard'); 
  };
  
  const handleLogout = () => { 
    sessionStorage.removeItem('franchiseLoggedIn'); // Supprime la session
    setIsFranchiseLoggedIn(false); 
    setPage('login'); 
  };
  
  const handleGoToWelcome = (fId, qId) => { window.location.href = `/quiz/${fId || 'demo-franchise'}/${qId || 'salon-bien-etre-2025'}`; };

  // Affiche un message si Firebase n'est pas configuré
  if (!app) {
    return (
        <div className="bg-gray-900 min-h-screen w-full flex items-center justify-center p-4 text-white text-center">
            <div>
                <h1 className="text-3xl font-bold text-red-500">Erreur de Configuration</h1>
                <p className="mt-4 text-lg">Les clés de configuration Firebase sont manquantes.</p>
                <p className="text-sm text-gray-400">Veuillez remplacer les clés dans le code ou configurer vos variables d'environnement.</p>
            </div>
        </div>
    )
  }

  const renderPage = () => {
    switch (page) {
        case 'dashboard':
            return <DashboardScreen franchiseId={franchiseId} onLogout={handleLogout} />;
        case 'login':
            return <FranchiseLoginScreen onLogin={handleLogin} onBack={handleGoToWelcome} franchiseId={franchiseId} quizId={quizId} />;
        case 'quiz': 
            return <QuizScreen quiz={selectedQuiz} onQuizComplete={handleQuizComplete} />;
        case 'form': 
            return <LeadFormScreen score={score} onSubmit={handleFormSubmit} onRestart={handleRestart} />;
        case 'success': 
            return <SuccessScreen onRestart={handleRestart} />;
        case 'welcome':
        default: 
            return <WelcomeScreen onStart={handleStartQuiz} />;
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
        body { font-family: 'Poppins', sans-serif; }
        @keyframes fade-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        .animate-checkmark {
            stroke-dasharray: 48;
            stroke-dashoffset: 48;
            animation: draw 0.5s ease-out 0.2s forwards;
        }
        @keyframes draw {
            to {
                stroke-dashoffset: 0;
            }
        }
      `}</style>
      <div className="bg-gray-900 min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
        {/* Glowing background shapes */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-violet-600 rounded-full filter blur-3xl opacity-30 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-fuchsia-600 rounded-full filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>
        <div className="z-10">{renderPage()}</div>
      </div>
      <div className="absolute bottom-4 right-4 z-20">
        {page === 'dashboard' ? (
            <button onClick={() => handleGoToWelcome(franchiseId, quizId)} className="text-sm text-gray-400 hover:text-violet-300 transition-colors">
                Retourner au Quiz
            </button>
        ) : (
            <button onClick={() => {
                window.location.href = `/dashboard/${franchiseId || 'demo-franchise'}`;
            }} className="text-sm text-gray-600 hover:text-violet-400 transition-colors">
                Accès Franchisé
            </button>
        )}
      </div>
    </>
  );
}
