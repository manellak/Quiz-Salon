import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, onSnapshot, Timestamp, doc, deleteDoc, setDoc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';
import { getAuth, signInAnonymously } from "firebase/auth";

// --- Configuration Firebase ---
// J'ai remis la configuration comme vous l'aviez partagée.
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
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    app = initializeApp(firebaseConfig);
} else {
    console.error("La configuration de Firebase est manquante ou invalide. Veuillez remplacer les valeurs d'espace réservé.");
}

const db = app ? getFirestore(app) : null;
const auth = app ? getAuth(app) : null;


// --- Données du Quiz Initial ---
// Ce quiz sera ajouté à la base de données au premier lancement si elle est vide.
const initialQuizData = {
    "salon-diagnostic-habitat": {
        title: "Quiz Diagnostic Habitat",
        questions: [
            { text: "Si vous aviez une baguette magique pour votre logement, votre premier geste serait de...",
              answers: [
                  { text: "Changer la décoration.", points: 0 },
                  { text: "Agrandir le salon pour recevoir.", points: 1 },
                  { text: "Rendre la salle de bain plus pratique.", points: 3 },
                  { text: "Supprimer tous les obstacles (escaliers, marches...).", points: 3 }
              ]
            },
            { text: "Penser à des travaux d'aménagement chez vous, c'est...",
              answers: [
                  { text: "Pas du tout d'actualité pour moi.", points: 0 },
                  { text: "Une idée qui trotte dans ma tête pour 'plus tard'.", points: 2 },
                  { text: "Compliqué, je ne saurais pas par où commencer.", points: 3 },
                  { text: "C'est un projet que j'envisage sérieusement.", points: 3 }
              ]
            },
            { text: "Le moment de la douche ou du bain, c'est...",
              answers: [
                  { text: "Un pur moment de détente, sans souci.", points: 1 },
                  { text: "De plus en plus une corvée, voire une appréhension.", points: 3 },
                  { text: "Rapide et efficace, mais je fais attention.", points: 2 },
                  { text: "Je n'y pense pas, c'est juste une routine.", points: 0 }
              ]
            },
            { text: "Vos escaliers, vous les voyez comme...",
              answers: [
                  { text: "Ma séance de sport quotidienne !", points: 0 },
                  { text: "Un passage obligé que j'aimerais éviter.", points: 3 },
                  { text: "Ils ne me dérangent pas pour l'instant.", points: 1 },
                  { text: "Un futur potentiel problème.", points: 2 }
              ]
            },
            { text: "En visitant des amis ou la famille, vous êtes-vous déjà dit...",
              answers: [
                  { text: "'Leur déco est superbe !'", points: 0 },
                  { text: "'C'est bien pensé chez eux, c'est si simple de circuler.'", points: 3 },
                  { text: "'Leur cuisine est beaucoup plus grande.'", points: 1 },
                  { text: "Rien de particulier, je profite du moment.", points: 0 }
              ]
            },
            { text: "Le terme 'logement adapté', pour vous, ça évoque...",
              answers: [
                  { text: "Quelque chose pour les 'vraies' personnes âgées.", points: 1 },
                  { text: "Un confort et une sécurité pour l'avenir.", points: 3 },
                  { text: "Un environnement médicalisé, un peu triste.", points: 2 },
                  { text: "Je n'ai pas vraiment d'avis.", points: 0 }
              ]
            },
            { text: "Comment vous projetez-vous chez vous dans les années à venir ?",
              answers: [
                  { text: "En toute sérénité, sans rien changer.", points: 1 },
                  { text: "En faisant le nécessaire pour y rester le plus longtemps possible.", points: 3 },
                  { text: "Envisager de déménager pour plus simple.", points: 2 },
                  { text: "Au jour le jour, sans trop y penser.", points: 0 }
              ]
            },
            { text: "Qu'est-ce qui pourrait vous décider à lancer des travaux d'aménagement ?",
              answers: [
                  { text: "Une chute ou une grosse frayeur.", points: 2 },
                  { text: "L'envie d'anticiper pour être tranquille plus tard.", points: 3 },
                  { text: "Gagner un gros lot au Loto !", points: 0 },
                  { text: "Des aides financières intéressantes.", points: 2 }
              ]
            },
            { text: "Quelle est cette petite chose du quotidien à la maison qui vous agace le plus ?",
              answers: [
                  { text: "Les bibelots qui prennent la poussière.", points: 0 },
                  { text: "Devoir se contorsionner pour atteindre les placards du bas.", points: 3 },
                  { text: "Le manque de luminosité dans une pièce.", points: 1 },
                  { text: "Les marches ou les petits seuils entre les pièces.", points: 3 }
              ]
            },
            { text: "Pour finir, si on vous proposait un rendez-vous pour discuter de vos projets, sans engagement...",
              answers: [
                  { text: "Pourquoi pas, je suis curieux/curieuse.", points: 3 },
                  { text: "Oui, si j'ai un vrai projet en tête.", points: 2 },
                  { text: "Non merci, pas pour le moment.", points: 0 },
                  { text: "Peut-être, mais j'ai peur des devis trop chers.", points: 2 }
              ]
            }
        ]
    },
};

// --- Fonctions Utilitaires ---
const getLevelInfo = (score) => {
    if (score <= 12) return { name: "Hors cible", hasWon: false, gift: null };
    if (score <= 19) return { name: "Lead faible", hasWon: false, gift: null };
    if (score <= 25) return { name: "Lead moyen", hasWon: true, gift: "Réduction 5%" };
    return { name: "Lead fort", hasWon: true, gift: "Diagnostic gratuit" };
};

const downloadCSV = (data, franchiseId) => {
    if (!data || data.length === 0) { console.warn("Export annulé : Aucune donnée."); return; }
    const headers = ["Prénom", "Nom", "Email", "Téléphone", "Score", "Niveau", "Cadeau", "Date", "Quiz"];
    const rows = data.map(lead => [
        `"${lead.firstName || ''}"`, `"${lead.lastName || ''}"`, `"${lead.email || ''}"`, `"${lead.phone || ''}"`,
        lead.score, `"${lead.level || ''}"`, `"${lead.gift || 'Aucun'}"`, `"${new Date(lead.createdAt.seconds * 1000).toLocaleString('fr-FR')}"`, `"${lead.quizTitle || ''}"`
    ]);
    let csvContent = headers.join(';') + '\n';
    rows.forEach(rowArray => { csvContent += rowArray.join(';') + '\n'; });
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
const FloatingAssets = () => {
    const assets = useMemo(() => [...Array(40)].map((_, i) => ({
        id: i,
        char: ['🎁', '🍬', '✨', '🎈', '🎉', '🏆'][Math.floor(Math.random() * 6)],
        style: {
            left: `${Math.random() * 100}%`,
            animationDuration: `${Math.random() * 8 + 8}s`,
            animationDelay: `-${Math.random() * 10}s`,
            fontSize: `${Math.random() * 40 + 35}px`,
        }
    })), []);

    return (
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
            {assets.map(asset => (
                <span key={asset.id} className="floating-asset" style={asset.style}>
                    {asset.char}
                </span>
            ))}
        </div>
    );
};

const WelcomeScreen = ({ onStart, isLoading }) => (
    <div className="text-center p-8">
        <div className="text-7xl mb-6 animate-bounce">🎁</div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800">
            Le Quiz Confort DOMetVIE
        </h1>
        <p className="mt-4 text-xl text-gray-600">Évaluez votre confort et tentez de gagner une surprise !</p>
        <button 
            onClick={onStart} 
            disabled={isLoading}
            className="mt-12 bg-pink-600 text-white font-bold py-4 px-10 rounded-lg shadow-lg hover:bg-pink-700 transition-all duration-300 transform hover:scale-105 active:scale-100 active:shadow-md text-xl uppercase tracking-wider disabled:opacity-50 disabled:cursor-wait"
        >
            {isLoading ? "Chargement..." : "Participer"}
        </button>
    </div>
);

const QuizScreen = ({ quiz, onQuizComplete }) => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    if (!quiz || !quiz.questions || quiz.questions.length === 0) {
        return <div className="p-8 text-center text-red-500 font-bold">Erreur : Le quiz n'a pas pu être chargé ou est vide.</div>;
    }

    const handleAnswer = (points) => {
        if (isAnimating) return;
        setIsAnimating(true);
        const newScore = score + points;
        setTimeout(() => {
            if (currentQuestionIndex < quiz.questions.length - 1) {
                setCurrentQuestionIndex(currentQuestionIndex + 1);
                setScore(newScore);
            } else {
                onQuizComplete(newScore);
            }
            setIsAnimating(false);
        }, 300);
    };

    const currentQuestion = quiz.questions[currentQuestionIndex];
    const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100;

    return (
        <div className={`w-full max-w-3xl mx-auto transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
            <div className="mb-4 text-center">
                <h1 className="text-2xl font-bold text-pink-600">{quiz.title}</h1>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3.5 mb-6 border-2 border-gray-300">
                <div className="bg-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="p-2">
                <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-800 leading-tight">{currentQuestion.text}</h2>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.answers.map((answer, index) => (
                        <button key={index} onClick={() => handleAnswer(answer.points)} className="w-full bg-white border-2 border-pink-600 text-pink-700 font-semibold py-4 px-6 rounded-lg hover:bg-pink-600 hover:text-white transition-all duration-200 text-xl transform hover:scale-105 active:scale-100">
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
    const handleChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };
    const handleSubmit = (e) => { e.preventDefault(); onSubmit({ ...formData, score, level: levelInfo.name, gift: levelInfo.gift }); };

    return (
        <div className="w-full max-w-md mx-auto text-center">
            <div className="p-8">
                <h2 className="text-4xl font-bold text-gray-800">Résultats</h2>
                <p className="mt-4 text-xl text-gray-600">Votre score : <span className="font-bold text-pink-600 text-2xl">{score}</span></p>
                {levelInfo.hasWon ? (
                    <div className="my-6 p-4 bg-pink-50 border-2 border-dashed border-pink-200 rounded-lg">
                        <p className="text-pink-700 font-bold text-2xl">
                            <span className="text-3xl">🎁</span><br />Félicitations !<br />Vous avez gagné un cadeau !
                        </p>
                    </div>
                ) : (
                    <div className="my-6 p-4 bg-gray-100 border-2 border-dashed border-gray-200 rounded-lg">
                        <p className="text-gray-700 text-xl">Merci d'avoir participé !</p>
                    </div>
                )}
                <p className="text-gray-500 mb-6 text-base">Laissez vos coordonnées pour recevoir votre surprise :</p>
                <form onSubmit={handleSubmit} className="space-y-3">
                    <input type="text" name="firstName" placeholder="Prénom" onChange={handleChange} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-800 text-lg" />
                    <input type="text" name="lastName" placeholder="Nom" onChange={handleChange} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-800 text-lg" />
                    <input type="email" name="email" placeholder="Email" onChange={handleChange} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-800 text-lg" />
                    <input type="tel" name="phone" placeholder="Téléphone" onChange={handleChange} required className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 text-gray-800 text-lg" />
                    <button type="submit" className="w-full bg-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-pink-700 transition-all uppercase tracking-wider">
                        Valider
                    </button>
                </form>
            </div>
            <button onClick={onRestart} className="mt-4 text-pink-700 hover:text-pink-900 transition-colors text-lg">Rejouer</button>
        </div>
    );
};

const SuccessScreen = ({ onRestart, hasWon }) => (
    <div className="text-center p-4 flex flex-col items-center relative overflow-hidden h-96 justify-center">
        {hasWon && <div className="absolute inset-0 pointer-events-none">
            {[...Array(100)].map((_, i) => (
                <div key={i} className="particle" style={{
                    left: `50%`,
                    top: '50%',
                    '--tx': `${(Math.random() - 0.5) * 800}%`,
                    '--ty': `${(Math.random() - 0.5) * 800}%`,
                    animationDelay: `${Math.random() * 0.2}s`,
                    backgroundColor: ['#e879f9', '#ec4899', '#f472b6', '#f0abfc'][Math.floor(Math.random() * 4)]
                }}></div>
            ))}
        </div>}
        <div className="animate-popup z-10">
            {hasWon ? (
                <div className="text-8xl animate-bounce">🎁</div>
            ) : (
                <div className="w-24 h-24 bg-pink-500/20 rounded-full flex items-center justify-center">
                    <svg className="w-16 h-16 text-pink-400 animate-checkmark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                </div>
            )}
        </div>
        <h1 className="text-5xl font-bold text-gray-800 mt-6 z-10">
            {hasWon ? "Félicitations !" : "Merci !"}
        </h1>
        <p className="mt-4 text-2xl text-gray-600 z-10">Vos informations sont bien enregistrées !</p>
        <button onClick={onRestart} className="mt-12 bg-pink-600 text-white font-bold py-4 px-10 rounded-full shadow-lg hover:bg-pink-700 transition-all text-xl uppercase tracking-wider z-10">
            Nouveau Participant
        </button>
    </div>
);

const FranchiseLoginScreen = ({ onLoginSuccess, initialFranchiseId = '' }) => {
    const [franchiseIdInput, setFranchiseIdInput] = useState(initialFranchiseId);
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const idToLogin = franchiseIdInput.trim().toLowerCase();
        if (!idToLogin || !pin || !db) return setError("Veuillez remplir tous les champs.");
        setLoading(true);
        setError('');

        try {
            const franchiseRef = doc(db, "franchisees", idToLogin);
            const franchiseSnap = await getDoc(franchiseRef);

            if (franchiseSnap.exists() && franchiseSnap.data().pinCode === pin) {
                onLoginSuccess(idToLogin);
            } else {
                setError('Identifiant ou PIN incorrect.');
            }
        } catch (err) {
            console.error("Erreur de connexion:", err);
            setError("Une erreur est survenue.");
        }
        setLoading(false);
    };

    return (
        <div className="w-full max-w-sm mx-auto p-4">
            <h2 className="text-4xl font-bold text-pink-700 text-center mb-6">Accès Franchisé</h2>
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <input type="text" value={franchiseIdInput} onChange={(e) => setFranchiseIdInput(e.target.value)} placeholder="Identifiant" disabled={loading} className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800 text-lg" />
                <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="----" maxLength="4" disabled={loading} className="w-full text-center text-2xl tracking-widest px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800" />
                {error && <p className="text-red-600 mt-2 text-center text-lg">{error}</p>}
                <button type="submit" disabled={loading} className="w-full bg-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-pink-700 uppercase tracking-wider disabled:opacity-50">
                    {loading ? "Vérification..." : "Connexion"}
                </button>
            </form>
        </div>
    );
};

const ConfirmationModal = ({ message, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-sm animate-fade-in">
            <h3 className="text-xl font-bold text-gray-800">Êtes-vous sûr ?</h3>
            <p className="text-gray-600 my-4">{message}</p>
            <div className="flex justify-center gap-4">
                <button onClick={onCancel} className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold">Annuler</button>
                <button onClick={onConfirm} className="px-6 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 font-semibold">Confirmer</button>
            </div>
        </div>
    </div>
);

const DashboardScreen = ({ franchiseId, onLogout, onStartQuiz }) => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [leadsToDelete, setLeadsToDelete] = useState([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedLeads, setSelectedLeads] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!franchiseId || !db) return;
        const leadsCollectionRef = collection(db, "franchisees", franchiseId, "leads");
        const q = query(leadsCollectionRef);

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const leadsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLeads(leadsData); setLoading(false);
        }, (error) => { console.error("Erreur BDD: ", error); setLoading(false); });
        return () => unsubscribe();
    }, [franchiseId]);
    
    const filteredAndSortedLeads = useMemo(() => {
        const filtered = leads.filter(lead => 
            (lead.firstName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.lastName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.email?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (lead.phone?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        );

        return filtered.sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));
    }, [leads, searchTerm]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const allVisibleLeadIds = filteredAndSortedLeads.map(lead => lead.id);
            setSelectedLeads(new Set(allVisibleLeadIds));
        } else {
            setSelectedLeads(new Set());
        }
    };

    const handleSelectLead = (leadId) => {
        const newSelection = new Set(selectedLeads);
        if (newSelection.has(leadId)) {
            newSelection.delete(leadId);
        } else {
            newSelection.add(leadId);
        }
        setSelectedLeads(newSelection);
    };

    const handleDeleteClick = (lead) => {
        setLeadsToDelete([lead]);
        setIsDeleteModalOpen(true);
    };
    
    const handleDeleteSelectedClick = () => {
        const selected = leads.filter(lead => selectedLeads.has(lead.id));
        setLeadsToDelete(selected);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (leadsToDelete.length === 0 || !db) return;
        
        try {
            const batch = writeBatch(db);
            leadsToDelete.forEach(lead => {
                const docRef = doc(db, "franchisees", franchiseId, "leads", lead.id);
                batch.delete(docRef);
            });
            await batch.commit();
            
            setLeadsToDelete([]);
            setIsDeleteModalOpen(false);
            if (selectedLeads.size > 0) setSelectedLeads(new Set());
        } catch (error) {
            console.error("Erreur de suppression: ", error);
        }
    };

    const getModalMessage = () => {
        if(leadsToDelete.length > 1) {
            return `Voulez-vous vraiment supprimer les ${leadsToDelete.length} leads sélectionnés ?`
        }
        if(leadsToDelete.length === 1) {
             const lead = leadsToDelete[0];
             return `Voulez-vous vraiment supprimer le lead de ${lead.firstName} ${lead.lastName} ?`;
        }
        return '';
    }

    return (
        <>
            {isDeleteModalOpen && (
                <ConfirmationModal
                    message={getModalMessage()}
                    onConfirm={confirmDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                />
            )}
            <div className="w-full max-w-7xl mx-auto p-2 sm:p-4 text-gray-800">
                <div className="flex flex-col sm:flex-row justify-between items-center mb-2 gap-4">
                    <h1 className="text-4xl text-gray-800">Dashboard <span className="font-bold text-pink-600">{franchiseId}</span> <span className="text-2xl text-gray-500 font-normal ml-2">({leads.length} leads)</span></h1>
                     <div className="flex gap-2 flex-wrap justify-center items-center">
                        <button onClick={onStartQuiz} className="bg-pink-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-pink-700 text-sm uppercase">Lancer un Quiz</button>
                        <button onClick={() => downloadCSV(leads, franchiseId)} className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-green-700 text-sm uppercase">Exporter CSV</button>
                        <button onClick={onLogout} className="bg-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-gray-600 text-sm uppercase">Logout</button>
                    </div>
                </div>
                 <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                    <input 
                        type="text" 
                        placeholder="Rechercher un lead..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:w-1/3 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                    {selectedLeads.size > 0 && (
                         <button onClick={handleDeleteSelectedClick} className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-red-700 text-sm uppercase">
                             Supprimer la sélection ({selectedLeads.size})
                         </button>
                    )}
                 </div>
                <div className="bg-white/80 p-2 sm:p-4 rounded-lg shadow-inner">
                    {loading ? <p>Chargement...</p> : leads.length === 0 ? (
                        <div className="text-center py-8"><h3 className="text-xl font-bold">Aucun lead</h3><p className="mt-2 text-gray-600">Complétez un quiz pour voir les données ici.</p></div>
                    ) : (
                        <div className="max-h-[32rem] overflow-y-auto">
                            <table className="w-full text-left text-base sm:text-lg">
                                <thead className="text-pink-700 sticky top-0 bg-white/80 backdrop-blur-sm">
                                    <tr className="border-b-2 border-pink-200">
                                        <th className="p-3 w-4"><input type="checkbox" onChange={handleSelectAll} checked={filteredAndSortedLeads.length > 0 && selectedLeads.size === filteredAndSortedLeads.length} /></th>
                                        <th className="p-3">Nom</th><th className="p-3">Contact</th><th className="p-3">Score</th><th className="p-3">Niveau</th><th className="p-3">Quiz</th><th className="p-3">Date</th><th className="p-3">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSortedLeads.map(lead => (
                                        <tr key={lead.id} className={`border-b border-pink-100 ${selectedLeads.has(lead.id) ? 'bg-pink-100' : 'hover:bg-pink-50'}`}>
                                            <td className="p-3"><input type="checkbox" checked={selectedLeads.has(lead.id)} onChange={() => handleSelectLead(lead.id)} /></td>
                                            <td className="p-3">{lead.firstName} {lead.lastName}</td><td className="p-3">{lead.email}<br />{lead.phone}</td>
                                            <td className="p-3 font-bold text-green-600">{lead.score}</td><td className="p-3 font-semibold">{lead.level}</td>
                                            <td className="p-3 font-semibold text-gray-600">{lead.quizTitle || 'N/A'}</td>
                                            <td className="p-3 text-sm text-gray-500">{new Date(lead.createdAt.seconds * 1000).toLocaleString('fr-FR')}</td>
                                            <td className="p-3">
                                                <button onClick={() => handleDeleteClick(lead)} className="text-red-500 hover:text-red-700 transition-colors">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

// --- Composant pour le formulaire de création/modification de quiz ---
const QuizForm = ({ initialQuiz, onSave, onCancel }) => {
    const isEditing = !!initialQuiz.id;
    const [title, setTitle] = useState(initialQuiz.title || '');
    const [questions, setQuestions] = useState(initialQuiz.questions && initialQuiz.questions.length > 0 ? JSON.parse(JSON.stringify(initialQuiz.questions)) : [{ text: '', answers: [{ text: '', points: 0 }, { text: '', points: 0 }] }]);
    const [isSaving, setIsSaving] = useState(false);

    const handleAddQuestion = () => setQuestions([...questions, { text: '', answers: [{ text: '', points: 0 }, { text: '', points: 0 }] }]);
    const handleRemoveQuestion = (index) => setQuestions(questions.filter((_, i) => i !== index));
    const handleQuestionChange = (index, value) => {
        const updated = [...questions];
        updated[index].text = value;
        setQuestions(updated);
    };

    const handleAddAnswer = (qIndex) => {
        const updated = [...questions];
        updated[qIndex].answers.push({ text: '', points: 0 });
        setQuestions(updated);
    };
    const handleRemoveAnswer = (qIndex, aIndex) => {
        const updated = [...questions];
        updated[qIndex].answers = updated[qIndex].answers.filter((_, i) => i !== aIndex);
        setQuestions(updated);
    };
    const handleAnswerChange = (qIndex, aIndex, field, value) => {
        const updated = [...questions];
        const val = field === 'points' ? parseInt(value, 10) || 0 : value;
        updated[qIndex].answers[aIndex][field] = val;
        setQuestions(updated);
    };

    const handleSave = async () => {
        if (!title.trim()) return alert("Le titre du quiz est obligatoire.");
        setIsSaving(true);
        await onSave({ ...initialQuiz, title, questions });
        setIsSaving(false);
    };

    return (
        <div className="bg-white/80 p-6 rounded-lg shadow-inner animate-fade-in">
            <h2 className="text-3xl font-bold mb-4 text-pink-600">{isEditing ? 'Modifier le Quiz' : 'Créer un nouveau Quiz'}</h2>
            <div className="space-y-4">
                <input
                    type="text"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Titre du Quiz"
                    className="w-full text-2xl font-bold px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                    disabled={isEditing}
                />
                 {isEditing && <p className="text-xs text-gray-500">Le titre (et donc l'ID) du quiz ne peut pas être modifié.</p>}
                
                {questions.map((q, qIndex) => (
                    <div key={qIndex} className="p-4 border border-pink-200 rounded-lg bg-pink-50/50 space-y-3">
                        <div className="flex justify-between items-center">
                            <label className="font-bold text-gray-700">Question {qIndex + 1}</label>
                            {questions.length > 1 && <button onClick={() => handleRemoveQuestion(qIndex)} className="text-red-500 hover:text-red-700">🗑️ Supprimer Question</button>}
                        </div>
                        <textarea value={q.text} onChange={e => handleQuestionChange(qIndex, e.target.value)} placeholder="Texte de la question" className="w-full px-3 py-2 border rounded-md" rows="2"></textarea>
                         <h4 className="font-semibold text-gray-600">Réponses :</h4>
                         {q.answers.map((a, aIndex) => (
                            <div key={aIndex} className="flex gap-2 items-center">
                                <input type="text" value={a.text} onChange={e => handleAnswerChange(qIndex, aIndex, 'text', e.target.value)} placeholder={`Réponse ${aIndex + 1}`} className="flex-grow px-3 py-2 border rounded-md" />
                                <input type="number" value={a.points} onChange={e => handleAnswerChange(qIndex, aIndex, 'points', e.target.value)} placeholder="Points" className="w-24 px-3 py-2 border rounded-md" />
                                {q.answers.length > 2 && <button onClick={() => handleRemoveAnswer(qIndex, aIndex)} className="text-red-500 hover:text-red-700 text-2xl">×</button>}
                            </div>
                         ))}
                         <button onClick={() => handleAddAnswer(qIndex)} className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200">+ Ajouter Réponse</button>
                    </div>
                ))}
                <button onClick={handleAddQuestion} className="w-full py-2 bg-green-100 text-green-700 font-semibold rounded-lg hover:bg-green-200">➕ Ajouter une Question</button>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={onCancel} className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-6 rounded-lg">Annuler</button>
                <button onClick={handleSave} disabled={isSaving} className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-2 px-6 rounded-lg disabled:opacity-50">
                    {isSaving ? "Sauvegarde..." : "Enregistrer le Quiz"}
                </button>
            </div>
        </div>
    )
};


// --- Composant principal pour la gestion des quiz ---
const QuizEditor = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [quizToEdit, setQuizToEdit] = useState(null); // null, or quiz object for create/edit
    const [quizToDelete, setQuizToDelete] = useState(null);

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const q = query(collection(db, "quizzes"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const quizzesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setQuizzes(quizzesList);
            setLoading(false);
        }, (err) => {
            console.error("Erreur de chargement des quiz:", err);
            setError("Impossible de charger les quiz.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const handleSaveQuiz = async (quizData) => {
        try {
            if (quizData.id) { // Editing existing quiz
                const { id, ...dataToSave } = quizData;
                await updateDoc(doc(db, "quizzes", id), dataToSave);
            } else { // Creating new quiz
                const quizId = generateSlug(quizData.title);
                await setDoc(doc(db, "quizzes", quizId), {title: quizData.title, questions: quizData.questions});
            }
            setQuizToEdit(null);
        } catch (e) {
            console.error("Erreur de sauvegarde du quiz: ", e);
            alert("Une erreur s'est produite lors de la sauvegarde.");
        }
    };
    
    const handleDeleteQuiz = async () => {
        if (!quizToDelete) return;
        try {
            await deleteDoc(doc(db, "quizzes", quizToDelete.id));
            setQuizToDelete(null);
        } catch (e) {
            console.error("Erreur de suppression du quiz: ", e);
             alert("Une erreur s'est produite lors de la suppression.");
        }
    };

    if (loading) return <p>Chargement des quiz...</p>;
    if (error) return <p className="text-red-500">{error}</p>;
    
    if (quizToEdit) {
        return <QuizForm initialQuiz={quizToEdit} onSave={handleSaveQuiz} onCancel={() => setQuizToEdit(null)} />;
    }

    return (
        <div className="bg-white/80 p-6 rounded-lg shadow-inner">
            {quizToDelete && (
                <ConfirmationModal 
                    message={`Voulez-vous vraiment supprimer le quiz "${quizToDelete.title}" ? Cette action est irréversible.`}
                    onConfirm={handleDeleteQuiz}
                    onCancel={() => setQuizToDelete(null)}
                />
            )}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold text-pink-600">Liste des Quiz</h2>
                <button onClick={() => setQuizToEdit({})} className="bg-pink-600 text-white font-bold py-2 px-4 rounded-lg shadow-md hover:bg-pink-700">+ Créer un Quiz</button>
            </div>
            <div className="space-y-3">
                {quizzes.map(quiz => (
                    <div key={quiz.id} className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 shadow-sm">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">{quiz.title}</h3>
                            <p className="text-sm text-gray-500">{quiz.questions?.length || 0} questions</p>
                        </div>
                        <div className="flex gap-4">
                             <button onClick={() => setQuizToEdit(quiz)} className="text-blue-500 hover:text-blue-700 text-2xl" title="Modifier">✏️</button>
                            <button onClick={() => setQuizToDelete(quiz)} className="text-red-500 hover:text-red-700 text-2xl" title="Supprimer">🗑️</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
};


const AdminScreen = () => {
    const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('adminLoggedIn') === 'true');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');

    const [franchiseName, setFranchiseName] = useState('');
    const [franchisees, setFranchisees] = useState([]);
    const [totalLeads, setTotalLeads] = useState(0);
    const [newFranchiseInfo, setNewFranchiseInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [editingFranchise, setEditingFranchise] = useState(null);
    const [view, setView] = useState('franchisees'); // 'franchisees' or 'quizzes'
    const [franchiseToDelete, setFranchiseToDelete] = useState(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!isLoggedIn || !db || view !== 'franchisees') return;
        const fetchFranchisees = async () => {
            setLoading(true);
            try {
                const querySnapshot = await getDocs(collection(db, "franchisees"));
                const franchiseesList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setFranchisees(franchiseesList);
            } catch (e) {
                console.error("Erreur de récupération des franchisés:", e);
                setError("Impossible de charger la liste des franchisés.");
            }
            setLoading(false);
        };
        fetchFranchisees();
    }, [isLoggedIn, view]);
    
    useEffect(() => {
        if (!isLoggedIn || !db || view !== 'franchisees') {
            return;
        }

        const fetchAllLeads = async () => {
            let count = 0;
            for (const franchisee of franchisees) {
                try {
                    const leadsCollectionRef = collection(db, "franchisees", franchisee.id, "leads");
                    const snapshot = await getDocs(leadsCollectionRef);
                    count += snapshot.size;
                } catch (e) {
                    console.error(`Impossible de charger les leads pour ${franchisee.id}`, e);
                }
            }
            setTotalLeads(count);
        };

        if (franchisees.length > 0) {
            fetchAllLeads();
        } else {
            setTotalLeads(0);
        }
    }, [isLoggedIn, view, franchisees]);

    const filteredAndSortedFranchisees = useMemo(() => {
        return franchisees
            .filter(f => 
                (f.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                (f.id?.toLowerCase() || '').includes(searchTerm.toLowerCase())
            )
            .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }, [franchisees, searchTerm]);

    const handleAdminLogin = (e) => {
        e.preventDefault();
        if (pin === '0000') {
            sessionStorage.setItem('adminLoggedIn', 'true');
            setIsLoggedIn(true);
            setError('');
        } else {
            setError('PIN Admin incorrect.');
        }
        setPin('');
    };
    
    const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const generatePin = () => Math.floor(1000 + Math.random() * 9000).toString();

    const handleAddFranchise = async (e) => {
        e.preventDefault();
        if (!franchiseName.trim() || !db) return;
        setLoading(true);

        const id = generateSlug(franchiseName);
        const pinCode = generatePin();

        try {
            await setDoc(doc(db, "franchisees", id), {
                name: franchiseName,
                pinCode: pinCode,
                createdAt: Timestamp.now()
            });
            const newFranchise = { id, name: franchiseName, pinCode };
            setFranchisees([...franchisees, newFranchise]);
            setNewFranchiseInfo(newFranchise);
            setFranchiseName('');
        } catch (err) {
            console.error("Erreur ajout franchisé:", err);
            setError("Impossible de créer le franchisé.")
        }
        setLoading(false);
    };

    const handleUpdateName = async (id, newName) => {
        try {
            await updateDoc(doc(db, "franchisees", id), { name: newName });
            setFranchisees(franchisees.map(f => f.id === id ? { ...f, name: newName } : f));
            setEditingFranchise(null);
        } catch (e) { console.error("Update error: ", e); }
    };

    const handleRegeneratePin = async (id) => {
        const newPin = generatePin();
        try {
            await updateDoc(doc(db, "franchisees", id), { pinCode: newPin });
            setFranchisees(franchisees.map(f => f.id === id ? { ...f, pinCode: newPin } : f));
        } catch (e) { console.error("Update error: ", e); }
    };

    const confirmDeleteFranchise = async () => {
        if (!franchiseToDelete) return;
        try {
            await deleteDoc(doc(db, "franchisees", franchiseToDelete.id));
            setFranchisees(franchisees.filter(f => f.id !== franchiseToDelete.id));
            setFranchiseToDelete(null);
        } catch (e) {
            console.error("Delete error: ", e);
            setFranchiseToDelete(null);
        }
    };


    if (!isLoggedIn) {
        return (
            <div className="w-full max-w-sm mx-auto p-4 text-center">
                <h2 className="text-4xl font-bold text-pink-700 mb-6">Accès Super Admin</h2>
                <form onSubmit={handleAdminLogin}>
                    <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="----" maxLength="4" className="w-full text-center text-3xl tracking-widest px-4 py-3 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 text-gray-800" />
                    {error && <p className="text-red-600 mt-2 text-lg">{error}</p>}
                    <button type="submit" className="mt-6 w-full bg-pink-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg hover:bg-pink-700 uppercase tracking-wider">Entrer</button>
                </form>
            </div>
        );
    }
    
    return (
        <div className="w-full max-w-5xl mx-auto p-4 text-gray-800">
             {franchiseToDelete && (
                <ConfirmationModal 
                    message={`Voulez-vous vraiment supprimer le franchisé "${franchiseToDelete.name}" ? Toutes ses données de leads seront perdues.`}
                    onConfirm={confirmDeleteFranchise}
                    onCancel={() => setFranchiseToDelete(null)}
                />
            )}
            <h1 className="text-4xl font-bold text-pink-600 mb-6 text-center">Panneau d'Administration</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-white/80 p-6 rounded-lg shadow-inner text-center">
                    <h3 className="text-xl font-bold text-gray-500 uppercase">Franchisés</h3>
                    <p className="text-5xl font-bold text-pink-600">{franchisees.length}</p>
                </div>
                <div className="bg-white/80 p-6 rounded-lg shadow-inner text-center">
                    <h3 className="text-xl font-bold text-gray-500 uppercase">Total Leads</h3>
                    <p className="text-5xl font-bold text-pink-600">{totalLeads}</p>
                </div>
            </div>
            
            <div className="flex justify-center mb-6 border-b-2 border-pink-200">
                <button onClick={() => setView('franchisees')} className={`px-6 py-2 text-xl font-semibold transition-colors duration-200 ${view === 'franchisees' ? 'text-pink-600 border-b-4 border-pink-600' : 'text-gray-500 hover:text-pink-500'}`}>
                    Gérer les Franchisés
                </button>
                <button onClick={() => setView('quizzes')} className={`px-6 py-2 text-xl font-semibold transition-colors duration-200 ${view === 'quizzes' ? 'text-pink-600 border-b-4 border-pink-600' : 'text-gray-500 hover:text-pink-500'}`}>
                    Gérer les Quiz
                </button>
            </div>

            {view === 'quizzes' && <QuizEditor />}
            
            {view === 'franchisees' && (
                <div className="animate-fade-in space-y-8">
                    <div className="bg-white/80 p-6 rounded-lg shadow-inner">
                        <h2 className="text-2xl font-bold mb-4">Ajouter un Franchisé</h2>
                        <form onSubmit={handleAddFranchise} className="flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-grow w-full">
                                <label htmlFor="franchiseName" className="block text-sm font-bold text-gray-600 mb-1">Nom du nouveau franchisé</label>
                                <input id="franchiseName" type="text" value={franchiseName} onChange={(e) => setFranchiseName(e.target.value)} placeholder="Ex: Lyon Centre" required className="w-full px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full sm:w-auto bg-pink-600 text-white font-bold py-2 px-6 rounded-lg shadow-md hover:bg-pink-700 h-11 disabled:opacity-50">{loading ? "..." : "Créer"}</button>
                        </form>
                        {newFranchiseInfo && (
                            <div className="mt-4 p-4 bg-green-100 border-l-4 border-green-500 text-green-800 rounded-lg">
                                <h4 className="font-bold">Franchisé créé !</h4>
                                <p>ID à utiliser dans l'URL: <span className="font-mono bg-gray-200 px-1 rounded">{newFranchiseInfo.id}</span></p>
                                <p>Code PIN: <span className="font-mono bg-gray-200 px-1 rounded">{newFranchiseInfo.pinCode}</span></p>
                            </div>
                        )}
                    </div>

                    <div className="bg-white/80 p-6 rounded-lg shadow-inner">
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
                            <h2 className="text-2xl font-bold">Liste des Franchisés</h2>
                             <input 
                                type="text" 
                                placeholder="Rechercher par nom ou ID..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full sm:w-1/3 px-4 py-2 bg-white border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
                            />
                        </div>
                        <div className="max-h-[32rem] overflow-y-auto">
                            {loading ? <p>Chargement...</p> : error ? <p className="text-red-500">{error}</p> : (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-white/80 backdrop-blur-sm">
                                      <tr className="border-b-2 border-pink-200"><th className="p-2">Nom</th><th className="p-2">ID</th><th className="p-2">PIN</th><th className="p-2">Actions</th></tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSortedFranchisees.map(f => (
                                            <tr key={f.id} className="border-b border-pink-100">
                                                <td className="p-2 font-semibold">
                                                    {editingFranchise === f.id ? (
                                                        <input type="text" defaultValue={f.name} onBlur={(e) => handleUpdateName(f.id, e.target.value)} autoFocus className="px-2 py-1 border rounded" />
                                                    ) : f.name}
                                                </td>
                                                <td className="p-2 font-mono bg-gray-100">{f.id}</td>
                                                <td className="p-2 font-mono bg-gray-100">{f.pinCode}</td>
                                                <td className="p-2 flex gap-2">
                                                    <button onClick={() => setEditingFranchise(f.id)} className="text-blue-500 hover:text-blue-700" title="Modifier le nom">✏️</button>
                                                    <button onClick={() => handleRegeneratePin(f.id)} className="text-yellow-500 hover:text-yellow-700" title="Régénérer le PIN">🔄</button>
                                                    <button onClick={() => setFranchiseToDelete(f)} className="text-red-500 hover:text-red-700" title="Supprimer">🗑️</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
             )}
        </div>
    );
};

// --- Composant Principal de l'Application ---
export default function App() {
    const [page, setPage] = useState(null);
    const [score, setScore] = useState(0);
    const [franchiseId, setFranchiseId] = useState(null);
    const [quizId, setQuizId] = useState(null);
    const [lastResult, setLastResult] = useState({ hasWon: false });

    const [allQuizzes, setAllQuizzes] = useState({});
    const [isQuizzesLoading, setIsQuizzesLoading] = useState(true);

    // Effet pour initialiser l'authentification et charger les données
    useEffect(() => {
        if (auth) {
            signInAnonymously(auth).catch(error => console.error("Auth failed", error));
        }

        // Variable pour stocker la fonction de désinscription de Firestore
        let unsubscribeFromQuizzes = () => {};

        const setupInitialData = async () => {
            if (!db) return;
            // 1. Migrer le quiz initial si nécessaire
            const quizzesRef = collection(db, 'quizzes');
            const qSnap = await getDocs(quizzesRef);
            if (qSnap.empty) {
                console.log("Aucun quiz trouvé, création du quiz initial...");
                try {
                    const quizIdToCreate = Object.keys(initialQuizData)[0];
                    const quizData = initialQuizData[quizIdToCreate];
                    await setDoc(doc(db, 'quizzes', quizIdToCreate), quizData);
                    console.log("Quiz initial créé.");
                } catch (error) {
                    console.error("Erreur de création du quiz initial:", error);
                }
            }

            // 2. Écouter les changements sur les quiz et assigner la fonction de désinscription
            unsubscribeFromQuizzes = onSnapshot(quizzesRef, (snapshot) => {
                const fetchedQuizzes = {};
                snapshot.forEach(doc => {
                    fetchedQuizzes[doc.id] = { id: doc.id, ...doc.data() };
                });
                setAllQuizzes(fetchedQuizzes);
                setIsQuizzesLoading(false);
            }, (error) => {
                console.error("Erreur de chargement des quiz:", error);
                setIsQuizzesLoading(false);
            });
        };

        setupInitialData();

        // 3. Gérer le routage initial
        const path = window.location.pathname.split('/').filter(p => p);
        const loggedInFranchise = sessionStorage.getItem('franchiseLoggedIn');

        if (path[0] === 'admin') {
            setPage('admin');
        } else if (path[0] === 'dashboard') {
             const dashboardFranchiseId = path[1];
             if (loggedInFranchise === dashboardFranchiseId) {
                setFranchiseId(dashboardFranchiseId);
                setPage('dashboard');
             } else {
                 sessionStorage.setItem('redirectUrl', window.location.pathname);
                 window.location.href = `/login?franchise_id=${dashboardFranchiseId || ''}`;
             }
        } else if (path[0] === 'login') {
            const params = new URLSearchParams(window.location.search);
            setFranchiseId(params.get('franchise_id'));
            setPage('login');
        } else if (path[0] === 'quiz') {
            const quizFranchiseId = path[1];
             if (loggedInFranchise === quizFranchiseId) {
                 setFranchiseId(quizFranchiseId);
                 setPage('welcome'); // Toujours commencer par l'écran d'accueil
             } else {
                 sessionStorage.setItem('redirectUrl', window.location.pathname);
                 window.location.href = `/login?franchise_id=${quizFranchiseId || ''}`;
             }
        } else {
            // Par défaut, rediriger vers login si l'URL est inconnue ou racine
            window.location.href = `/login`;
        }

        // La fonction de nettoyage appellera la dernière fonction assignée à unsubscribeFromQuizzes
        return () => {
             unsubscribeFromQuizzes();
        };
    }, []);

    const selectedQuiz = useMemo(() => allQuizzes[quizId], [allQuizzes, quizId]);

    const handleStartQuiz = () => {
        const quizIds = Object.keys(allQuizzes);
        if (quizIds.length === 0) {
            alert("Aucun quiz n'est disponible pour le moment. Veuillez contacter l'administrateur.");
            return;
        }
        const randomQuizId = quizIds[Math.floor(Math.random() * quizIds.length)];
        setQuizId(randomQuizId);
        setPage('quiz');
    };

    const handleQuizComplete = (finalScore) => {
        setScore(finalScore);
        setLastResult(getLevelInfo(finalScore));
        setPage('form');
    };

    const handleFormSubmit = async (leadData) => {
        if (!db || !franchiseId || !selectedQuiz) return;
        try {
            await addDoc(collection(db, "franchisees", franchiseId, "leads"), {
                ...leadData,
                quizId: selectedQuiz.id,
                quizTitle: selectedQuiz.title,
                createdAt: Timestamp.now()
            });
            setPage('success');
        } catch (e) { console.error("Erreur BDD: ", e); }
    };
    
    const handleRestart = () => {
        setScore(0);
        setQuizId(null);
        setLastResult({ hasWon: false });
        // Redirige vers la page d'accueil du quiz pour ce franchisé
        window.location.href = `/quiz/${franchiseId}`;
    };

    const handleLoginSuccess = (loggedInFranchiseId) => {
        sessionStorage.setItem('franchiseLoggedIn', loggedInFranchiseId);
        const redirectUrl = sessionStorage.getItem('redirectUrl');
        sessionStorage.removeItem('redirectUrl');
        window.location.href = redirectUrl || `/dashboard/${loggedInFranchiseId}`;
    };

    const handleLogout = () => {
        const currentFranchiseId = sessionStorage.getItem('franchiseLoggedIn');
        sessionStorage.removeItem('franchiseLoggedIn');
        window.location.href = `/login?franchise_id=${currentFranchiseId || ''}`;
    };

    if (!app) {
        return (
            <div className="bg-gray-100 min-h-screen w-full flex items-center justify-center p-4 text-gray-800 text-center">
                <div><h1 className="text-3xl font-bold text-red-500">Erreur de Configuration</h1><p className="mt-4 text-lg">Les clés Firebase sont manquantes.</p></div>
            </div>
        )
    }

    if (!page) {
        return <div className="bg-gray-100 min-h-screen w-full flex items-center justify-center"><div className="text-xl font-bold text-pink-500">Chargement...</div></div>;
    }

    const renderPage = () => {
        switch (page) {
            case 'admin': return <AdminScreen />;
            case 'dashboard': return <DashboardScreen franchiseId={franchiseId} onLogout={handleLogout} onStartQuiz={() => window.location.href = `/quiz/${franchiseId}`} />;
            case 'login': return <FranchiseLoginScreen onLoginSuccess={handleLoginSuccess} initialFranchiseId={franchiseId} />;
            case 'quiz': return <QuizScreen quiz={selectedQuiz} onQuizComplete={handleQuizComplete} />;
            case 'form': return <LeadFormScreen score={score} onSubmit={handleFormSubmit} onRestart={handleRestart} />;
            case 'success': return <SuccessScreen onRestart={handleRestart} hasWon={lastResult.hasWon} />;
            case 'welcome': default: return <WelcomeScreen onStart={handleStartQuiz} isLoading={isQuizzesLoading} />;
        }
    };

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&display=swap');
                
                .dometvie-background {
                    background-color: #f8f8f8;
                    font-family: 'Poppins', sans-serif;
                    overflow: hidden;
                }
                .main-card {
                    background-color: #ffffff;
                    backdrop-filter: blur(5px);
                    border: 1px solid #e2e8f0;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    border-radius: 1.5rem;
                    color: #333;
                    position: relative;
                    z-index: 10;
                }
                @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
                .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
                
                @keyframes popup {
                  0% { transform: scale(0); }
                  50% { transform: scale(1.1); }
                  100% { transform: scale(1); }
                }
                .animate-popup { animation: popup 0.5s ease-out forwards; }

                @keyframes checkmark { to { stroke-dashoffset: 0; } }
                .animate-checkmark { stroke-dasharray: 48; stroke-dashoffset: 48; animation: checkmark 0.5s ease-out 0.3s forwards; }

                @keyframes bounce {
                    0%, 100% { transform: translateY(0) rotate(-5deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                }
                .animate-bounce { animation: bounce 1.5s ease-in-out infinite; }
                
                .particle {
                    position: absolute;
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    animation: confetti-explode 0.7s ease-out forwards;
                }
                @keyframes confetti-explode {
                    0% { transform: translate(0, 0) scale(1); opacity: 1; }
                    100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
                }

                .floating-asset {
                     position: absolute;
                     color: #ec489955;
                     animation-name: float;
                     animation-timing-function: ease-in-out;
                     animation-iteration-count: infinite;
                     opacity: 0;
                     z-index: 0;
                }
                @keyframes float {
                     0% { transform: translateY(110vh) rotate(0deg); opacity: 0; }
                     10% { opacity: 1; }
                     90% { opacity: 1; }
                     100% { transform: translateY(-10vh) rotate(360deg) scale(1.3); opacity: 0; }
                }
            `}</style>
            <div className="dometvie-background min-h-screen w-full flex items-center justify-center p-2 sm:p-4 relative">
                <FloatingAssets />
                <div className="w-full max-w-5xl main-card animate-fade-in">
                    {renderPage()}
                </div>
            </div>
            <div className="absolute bottom-4 right-4 z-20">
                {page && (page.startsWith('quiz') || ['welcome', 'form', 'success'].includes(page)) ? (
                    <button onClick={() => window.location.href = `/dashboard/${franchiseId}`} className="text-xs text-gray-400 hover:text-pink-600 transition-colors font-bold uppercase">Accès Franchisé</button>
                ) : null }
            </div>
        </>
    );
}
