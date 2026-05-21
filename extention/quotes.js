// quotes.js

(function () {
  const quotes = [
    // David Goggins
    "You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.",
    "Don't stop when you're tired. Stop when you're done.",
    "Most people who doubt you doubt you because they can never see themselves doing what you're trying to do.",
    "Pain unlocks a secret doorway in the mind.",
    "Be uncomfortable every fucking day of your life.",
    "You have to build calluses on your brain just like how you build calluses on your hands.",
    "No one is going to come help you. No one’s coming to save you.",

    // Jocko Willink
    "Discipline equals freedom.",
    "Get after it.",
    "The more you practice, the better you get.",

    // General / Stoic / Focus
    "Do the hard work, especially when you don’t feel like it.",
    "Focus is a superpower.",
    "You don’t rise to the level of your goals, you fall to the level of your systems.",
    "The pain of discipline is far less than the pain of regret.",
    "Small steps every day lead to massive results.",
    "Your future is created by what you do today, not tomorrow.",
    "Stay hard.",
    "Win the day.",
    "Comfort is the enemy of progress.",
    "What you do today is what defines you.",
  ];

  function getRandomQuote() {
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  function createQuoteElement() {
    const quoteContainer = document.createElement("div");
    quoteContainer.style.marginTop = "10px";
    quoteContainer.style.padding = "10px";
    quoteContainer.style.border = "1px solid rgba(24,212,245,0.2)";
    quoteContainer.style.borderRadius = "6px";
    quoteContainer.style.background = "rgba(24,212,245,0.03)";
    quoteContainer.style.fontSize = "12px";
    quoteContainer.style.color = "#7a90a8";
    quoteContainer.style.fontStyle = "italic";
    quoteContainer.style.lineHeight = "1.4";
    quoteContainer.style.textAlign = "center";

    const quoteText = document.createElement("div");
    quoteText.textContent = `"${getRandomQuote()}"`;

    quoteContainer.appendChild(quoteText);

    return quoteContainer;
  }

  function injectQuote() {
    const target = document.querySelector(".panel-body");

    if (!target) return;

    const quoteEl = createQuoteElement();
    target.appendChild(quoteEl);
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectQuote);
  } else {
    injectQuote();
  }
})();