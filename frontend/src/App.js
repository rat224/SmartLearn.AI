import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { BookOpen, Languages, Brain, History, Loader2, Sparkles } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeTab, setActiveTab] = useState("summarize");
  const [loading, setLoading] = useState(false);
  
  // Summarization state
  const [summarizeText, setSummarizeText] = useState("");
  const [summary, setSummary] = useState("");
  
  // Translation state
  const [translateText, setTranslateText] = useState("");
  const [targetLang, setTargetLang] = useState("es");
  const [translation, setTranslation] = useState("");
  
  // Quiz state
  const [quizText, setQuizText] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [quiz, setQuiz] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  
  // History state
  const [history, setHistory] = useState([]);

  const handleSummarize = async () => {
    if (!summarizeText.trim()) {
      toast.error("Please enter text to summarize");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/summarize`, {
        text: summarizeText,
        max_length: 150,
        min_length: 40
      });
      setSummary(response.data.summary);
      toast.success("Summary generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    if (!translateText.trim()) {
      toast.error("Please enter text to translate");
      return;
    }
    
    setLoading(true);
    try {
      const response = await axios.post(`${API}/translate`, {
        text: translateText,
        source_lang: "en",
        target_lang: targetLang
      });
      setTranslation(response.data.translated_text);
      toast.success("Translation completed!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to translate text");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!quizText.trim()) {
      toast.error("Please enter text to generate quiz");
      return;
    }
    
    setLoading(true);
    setQuiz(null);
    setShowResults(false);
    setSelectedAnswers({});
    
    try {
      const response = await axios.post(`${API}/quiz`, {
        text: quizText,
        num_questions: numQuestions
      });
      setQuiz(response.data.questions);
      toast.success("Quiz generated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex, answer) => {
    setSelectedAnswers(prev => ({
      ...prev,
      [questionIndex]: answer
    }));
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    const correct = quiz.filter((q, idx) => selectedAnswers[idx] === q.correct_answer).length;
    toast.success(`You scored ${correct} out of ${quiz.length}!`);
  };

  const loadHistory = async () => {
    try {
      const response = await axios.get(`${API}/history`);
      setHistory(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      loadHistory();
    }
  }, [activeTab]);

  return (
    <div className="App">
      <Toaster position="top-right" />
      
      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-badge" data-testid="hero-badge">
            <Sparkles className="w-4 h-4" />
            <span>AI-Powered Learning</span>
          </div>
          <h1 className="hero-title" data-testid="hero-title">SmartLearn Web</h1>
          <p className="hero-subtitle" data-testid="hero-subtitle">
            Your multilingual AI study assistant for enhanced learning
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-container">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8" data-testid="main-tabs">
            <TabsTrigger value="summarize" data-testid="tab-summarize">
              <BookOpen className="w-4 h-4 mr-2" />
              Summarize
            </TabsTrigger>
            <TabsTrigger value="translate" data-testid="tab-translate">
              <Languages className="w-4 h-4 mr-2" />
              Translate
            </TabsTrigger>
            <TabsTrigger value="quiz" data-testid="tab-quiz">
              <Brain className="w-4 h-4 mr-2" />
              Quiz
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          {/* Summarize Tab */}
          <TabsContent value="summarize" data-testid="summarize-content">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle data-testid="summarize-title">Text Summarization</CardTitle>
                <CardDescription data-testid="summarize-description">
                  Condense lengthy text into concise, meaningful summaries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  data-testid="summarize-input"
                  placeholder="Paste your text here to summarize..."
                  value={summarizeText}
                  onChange={(e) => setSummarizeText(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <Button
                  data-testid="summarize-button"
                  onClick={handleSummarize}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating Summary...
                    </>
                  ) : (
                    "Generate Summary"
                  )}
                </Button>
                {summary && (
                  <div className="result-box" data-testid="summarize-result">
                    <h3 className="result-title">Summary:</h3>
                    <p className="result-text">{summary}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Translate Tab */}
          <TabsContent value="translate" data-testid="translate-content">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle data-testid="translate-title">Text Translation</CardTitle>
                <CardDescription data-testid="translate-description">
                  Translate text between multiple languages
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  data-testid="translate-input"
                  placeholder="Enter text to translate..."
                  value={translateText}
                  onChange={(e) => setTranslateText(e.target.value)}
                  className="min-h-[200px] resize-none"
                />
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium mb-2" data-testid="target-lang-label">
                      Target Language
                    </label>
                    <Select value={targetLang} onValueChange={setTargetLang}>
                      <SelectTrigger data-testid="target-lang-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="es" data-testid="lang-option-es">🇪🇸 Spanish</SelectItem>
                        <SelectItem value="fr" data-testid="lang-option-fr">🇫🇷 French</SelectItem>
                        <SelectItem value="de" data-testid="lang-option-de">🇩🇪 German</SelectItem>
                        <SelectItem value="it" data-testid="lang-option-it">🇮🇹 Italian</SelectItem>
                        <SelectItem value="pt" data-testid="lang-option-pt">🇵🇹 Portuguese</SelectItem>
                        <SelectItem value="nl" data-testid="lang-option-nl">🇳🇱 Dutch</SelectItem>
                        <SelectItem value="ru" data-testid="lang-option-ru">🇷🇺 Russian</SelectItem>
                        <SelectItem value="zh" data-testid="lang-option-zh">🇨🇳 Chinese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  data-testid="translate-button"
                  onClick={handleTranslate}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Translating...
                    </>
                  ) : (
                    "Translate"
                  )}
                </Button>
                {translation && (
                  <div className="result-box" data-testid="translate-result">
                    <h3 className="result-title">Translation:</h3>
                    <p className="result-text">{translation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quiz Tab */}
          <TabsContent value="quiz" data-testid="quiz-content">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle data-testid="quiz-title">Quiz Generation</CardTitle>
                <CardDescription data-testid="quiz-description">
                  Generate interactive quizzes from any text
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!quiz ? (
                  <>
                    <Textarea
                      data-testid="quiz-input"
                      placeholder="Paste educational content to generate a quiz..."
                      value={quizText}
                      onChange={(e) => setQuizText(e.target.value)}
                      className="min-h-[200px] resize-none"
                    />
                    <div>
                      <label className="block text-sm font-medium mb-2" data-testid="num-questions-label">
                        Number of Questions: {numQuestions}
                      </label>
                      <input
                        data-testid="num-questions-slider"
                        type="range"
                        min="1"
                        max="10"
                        value={numQuestions}
                        onChange={(e) => setNumQuestions(parseInt(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <Button
                      data-testid="generate-quiz-button"
                      onClick={handleGenerateQuiz}
                      disabled={loading}
                      className="w-full"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Generating Quiz...
                        </>
                      ) : (
                        "Generate Quiz"
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="quiz-container" data-testid="quiz-questions">
                      {quiz.map((question, qIdx) => (
                        <div key={qIdx} className="quiz-question" data-testid={`question-${qIdx}`}>
                          <h3 className="question-text" data-testid={`question-text-${qIdx}`}>
                            {qIdx + 1}. {question.question}
                          </h3>
                          <div className="options-list">
                            {question.options.map((option, oIdx) => {
                              const optionLetter = option.charAt(0);
                              const isSelected = selectedAnswers[qIdx] === optionLetter;
                              const isCorrect = optionLetter === question.correct_answer;
                              const showCorrect = showResults && isCorrect;
                              const showIncorrect = showResults && isSelected && !isCorrect;
                              
                              return (
                                <button
                                  key={oIdx}
                                  data-testid={`option-${qIdx}-${oIdx}`}
                                  onClick={() => !showResults && handleAnswerSelect(qIdx, optionLetter)}
                                  disabled={showResults}
                                  className={`option-button ${
                                    showCorrect ? 'correct' : showIncorrect ? 'incorrect' : isSelected ? 'selected' : ''
                                  }`}
                                >
                                  {option}
                                </button>
                              );
                            })}
                          </div>
                          {showResults && (
                            <div className="explanation" data-testid={`explanation-${qIdx}`}>
                              <strong>Explanation:</strong> {question.explanation}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4">
                      {!showResults && (
                        <Button
                          data-testid="submit-quiz-button"
                          onClick={handleSubmitQuiz}
                          disabled={Object.keys(selectedAnswers).length !== quiz.length}
                          className="flex-1"
                        >
                          Submit Quiz
                        </Button>
                      )}
                      <Button
                        data-testid="new-quiz-button"
                        onClick={() => {
                          setQuiz(null);
                          setSelectedAnswers({});
                          setShowResults(false);
                        }}
                        variant="outline"
                        className="flex-1"
                      >
                        New Quiz
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" data-testid="history-content">
            <Card className="feature-card">
              <CardHeader>
                <CardTitle data-testid="history-title">Recent Activity</CardTitle>
                <CardDescription data-testid="history-description">
                  Your recent summaries, translations, and quizzes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {history.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8" data-testid="history-empty">
                    No history yet. Start using the features above!
                  </p>
                ) : (
                  <div className="space-y-4">
                    {history.map((item, idx) => (
                      <div key={idx} className="history-item" data-testid={`history-item-${idx}`}>
                        <div className="history-header">
                          <span className="history-type" data-testid={`history-type-${idx}`}>
                            {item.content_type.toUpperCase()}
                          </span>
                          <span className="history-date" data-testid={`history-date-${idx}`}>
                            {new Date(item.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="history-text" data-testid={`history-text-${idx}`}>
                          {item.original_text.substring(0, 150)}...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;
