import React, { useRef } from "react";

interface DreamJournalProps {
  dreamText: string;
  setDreamText: (text: string) => void;
  mood: string;
  setMood: (mood: string) => void;
  category: string;
  setCategory: (cat: string) => void;
  keywords: string;
  setKeywords: (kw: string) => void;
}

const DreamJournal: React.FC<DreamJournalProps> = ({
  dreamText,
  setDreamText,
  mood,
  setMood,
  category,
  setCategory,
  keywords,
  setKeywords,
}) => {
  const [isRecording, setIsRecording] = React.useState(false);
  const recognitionRef = useRef<any>(null);

  // Check for browser support
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  const startRecording = () => {
    if (!SpeechRecognition) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setDreamText(dreamText + (dreamText ? " " : "") + transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognitionRef.current = recognition;
    setIsRecording(true);
    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="dream-journal">
      <h2>Dream Journal</h2>
      <textarea
        value={dreamText}
        onChange={(e) => setDreamText(e.target.value)}
        placeholder="Write or speak your dream here..."
        rows={8}
        style={{ width: "100%" }}
      />
      <div style={{ marginTop: 8 }}>
        {!isRecording ? (
          <button onClick={startRecording}>🎤 Start Voice Input</button>
        ) : (
          <button onClick={stopRecording}>⏹ Stop</button>
        )}
      </div>
      <div style={{ marginTop: 16, width: "100%" }}>
        <input
          type="text"
          value={mood}
          onChange={(e) => setMood(e.target.value)}
          placeholder="Mood (e.g. curious, anxious, happy)"
          style={{
            width: "100%",
            marginBottom: 8,
            borderRadius: 8,
            padding: 8,
            border: "1px solid #bdbdbd",
          }}
        />
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="Category (e.g. adventure, fantasy, nightmare)"
          style={{
            width: "100%",
            marginBottom: 8,
            borderRadius: 8,
            padding: 8,
            border: "1px solid #bdbdbd",
          }}
        />
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="Keywords (comma separated)"
          style={{
            width: "100%",
            marginBottom: 8,
            borderRadius: 8,
            padding: 8,
            border: "1px solid #bdbdbd",
          }}
        />
      </div>
    </div>
  );
};

export default DreamJournal;
