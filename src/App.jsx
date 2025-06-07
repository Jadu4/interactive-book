import { useState, useRef, useEffect } from 'react';

export default function App() {
  const [currentPage, setCurrentPage] = useState(null); // null = обложка
  const [isFlipping, setIsFlipping] = useState(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [bookmarks, setBookmarks] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [password, setPassword] = useState('');
  const [newSectionName, setNewSectionName] = useState('');
  const [showAddSectionModal, setShowAddSectionModal] = useState(false);

  // Структура книги: Разделы → Главы → Страницы
  const [bookStructure, setBookStructure] = useState([
    {
      id: 0,
      title: "Введение",
      chapters: [
        {
          id: 0,
          title: "Что такое книга?",
          pages: [
            {
              content: "<h2>Привет из редактора</h2><p>Это <b>пример текста</b>, <i>форматированного</i> в редакторе.</p>",
              isEditing: false,
            },
          ],
        },
      ],
    },
  ]);

  const timeoutRef = useRef(null);
  const bookRef = useRef(null);
  const editorRef = useRef(null);

  // Получаем плоский список страниц
  const getFlatPages = () => {
    const flatList = [];
    bookStructure.forEach((section, sIndex) => {
      section.chapters.forEach((chapter, cIndex) => {
        chapter.pages.forEach((page, pIndex) => {
          flatList.push({
            content: page.content,
            title: `${chapter.title} (${pIndex + 1})`,
            sectionId: sIndex,
            chapterId: cIndex,
            pageId: pIndex,
            isEditing: page.isEditing,
          });
        });
      });
    });
    return flatList;
  };

  const flatPages = getFlatPages();
  const savedPage = parseInt(localStorage.getItem('book_current_page')) || 0;

  // Открытие книги
  const openBook = () => {
    clearTimeout(timeoutRef.current);
    if (!isAdmin && showPasswordInput) return;
    setCurrentPage(savedPage);
  };

  const startHold = () => {
    timeoutRef.current = setTimeout(() => {
      setShowPasswordInput(true);
    }, 3000);
  };

  const cancelHold = () => {
    clearTimeout(timeoutRef.current);
  };

  const submitPassword = () => {
    if (password === 'adminroot') {
      setIsAdmin(true);
      localStorage.setItem('book_is_admin', 'true');
      setShowPasswordInput(false);
      setCurrentPage(savedPage);
    } else {
      alert('Неверный пароль');
    }
  };

  // Перелистывание страниц
  const goToPrevPage = () => {
    if (currentPage > 0 && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setIsFlipping(false);
        localStorage.setItem('book_current_page', currentPage - 1);
      }, 600);
    }
  };

  const goToNextPage = () => {
    if (currentPage < flatPages.length - 1 && !isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(currentPage + 1);
        setIsFlipping(false);
        localStorage.setItem('book_current_page', currentPage + 1);
      }, 600);
    }
  };

  const handleLeftClick = (e) => {
    const rect = bookRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width / 2) {
      goToPrevPage();
    } else {
      goToNextPage();
    }
  };

  const goToPage = (index) => {
    if (!isFlipping) {
      setIsFlipping(true);
      setTimeout(() => {
        setCurrentPage(index);
        setIsFlipping(false);
        setTocVisible(false);
        localStorage.setItem('book_current_page', index);
      }, 600);
    }
  };

  // Обработка свайпа
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);

  const handleTouchStart = (e) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 30) {
      if (diff > 0) {
        goToNextPage(); // ← свайп влево
      } else {
        goToPrevPage(); // → свайп вправо
      }
    }
  };

  // Закладки
  const toggleBookmark = (index) => {
    if (bookmarks.includes(index)) {
      setBookmarks(bookmarks.filter(i => i !== index));
    } else {
      setBookmarks([...bookmarks, index]);
    }
  };

  // Админские функции
  const addNewSection = () => {
    setShowAddSectionModal(true);
  };

  const confirmAddSection = () => {
    if (!newSectionName.trim()) return;
    const newSection = {
      id: bookStructure.length,
      title: newSectionName.trim(),
      chapters: [],
    };
    setBookStructure([...bookStructure, newSection]);
    setShowAddSectionModal(false);
    setNewSectionName('');
  };

  const addNewChapterToSection = (sectionId) => {
    const updated = [...bookStructure];
    const section = updated[sectionId];
    const newChapter = {
      id: section.chapters.length,
      title: `Новая глава ${section.chapters.length + 1}`,
      pages: [{ content: '<p>Новый контент</p>', isEditing: true }],
    };
    section.chapters.push(newChapter);
    setBookStructure(updated);
    setCurrentPage(flatPages.length);
  };

  const addNewPageToChapter = (sectionId, chapterId) => {
    const updated = [...bookStructure];
    const chapter = updated[sectionId].chapters[chapterId];
    chapter.pages.push({ content: '<p>Новая страница</p>', isEditing: true });
    setBookStructure(updated);
    setCurrentPage(flatPages.length);
  };

  const updatePageContent = (sectionId, chapterId, pageId, html) => {
    const updated = [...bookStructure];
    updated[sectionId].chapters[chapterId].pages[pageId].content = html;
    setBookStructure(updated);
  };

  const toggleEdit = (sectionId, chapterId, pageId) => {
    const updated = [...bookStructure];
    const page = updated[sectionId].chapters[chapterId].pages[pageId];
    page.isEditing = !page.isEditing;
    setBookStructure(updated);
  };

  // Инициализация данных
  useEffect(() => {
    const savedAdmin = localStorage.getItem('book_is_admin') === 'true';
    setIsAdmin(savedAdmin);
    const savedTheme = localStorage.getItem('book_dark_mode') !== 'false';
    setDarkMode(savedTheme);

    const savedBook = localStorage.getItem('book_structure');
    if (savedBook) {
      try {
        setBookStructure(JSON.parse(savedBook));
      } catch {}
    }

    const savedBookmarks = localStorage.getItem('book_bookmarks');
    if (savedBookmarks) {
      try {
        setBookmarks(JSON.parse(savedBookmarks));
      } catch {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('book_structure', JSON.stringify(bookStructure));
  }, [bookStructure]);

  useEffect(() => {
    localStorage.setItem('book_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Если текущая страница указана — получаем данные о ней
  let currentSectionId = null, currentChapterId = null, currentPageId = null;
  let currentPageData = null;

  if (currentPage !== null && flatPages[currentPage]) {
    currentSectionId = flatPages[currentPage].sectionId;
    currentChapterId = flatPages[currentPage].chapterId;
    currentPageId = flatPages[currentPage].pageId;
    currentPageData = bookStructure[currentSectionId]?.chapters[currentChapterId]?.pages[currentPageId];
  }

  // Обработка горячих клавиш
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isAdmin || !editorRef.current || !currentPageData?.isEditing) return;

      if (e.ctrlKey) {
        if (e.key === 'b' || e.key === 'B') {
          document.execCommand('bold', false);
          e.preventDefault();
        } else if (e.key === 'i' || e.key === 'I') {
          document.execCommand('italic', false);
          e.preventDefault();
        } else if (e.key === 'u' || e.key === 'U') {
          document.execCommand('underline', false);
          e.preventDefault();
        } else if (e.key === 'k' || e.key === 'K') {
          const url = prompt('Введите URL:');
          if (url) {
            document.execCommand('createLink', false, url);
          }
          e.preventDefault();
        } else if (e.key === 'z' || e.key === 'Z') {
          document.execCommand('undo');
          e.preventDefault();
        } else if (e.key === 'y' || e.key === 'Y') {
          document.execCommand('redo');
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, currentPageData]);

  // Обработчики редактирования
  const handleEditorInput = () => {
    if (currentSectionId !== null && currentChapterId !== null && currentPageId !== null) {
      const html = editorRef.current.innerHTML;
      updatePageContent(currentSectionId, currentChapterId, currentPageId, html);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 transition-colors duration-300 ${
      darkMode ? 'bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900' : 'bg-gradient-to-br from-blue-50 via-white to-blue-50'
    }`}>
      
      {/* Кнопки управления */}
      <div className="absolute top-2 right-4 z-10 flex gap-2">
        <button 
          onClick={() => setTocVisible(!tocVisible)}
          disabled={currentPage === null}
          className={`px-3 py-2 rounded-lg shadow-md transition-colors backdrop-blur-sm ${
            currentPage === null ? 'opacity-30 cursor-not-allowed' : ''
          } ${darkMode 
              ? 'bg-black/20 text-blue-400 hover:text-blue-300' 
              : 'bg-white/70 text-blue-600 hover:text-blue-700'
          }`}
        >
          {tocVisible ? "Скрыть" : "Оглавление"}
        </button>
        
        <button 
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full shadow-md transition-colors backdrop-blur-sm ${
            darkMode ? 'bg-black/20 text-yellow-400' : 'bg-white/70 text-gray-700'
          }`}
          aria-label="Переключить тему"
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </div>

      {/* Обложка */}
      {currentPage === null && (
        <div 
          className={`relative w-[600px] h-[400px] perspective-1000 ${
            darkMode ? 'bg-gradient-to-br from-indigo-900 via-purple-900 to-violet-900' : 'bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400'
          } border-4 rounded-xl shadow-2xl overflow-hidden flex items-center justify-center cursor-pointer`}
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          onClick={openBook}
        >
          <div className="text-white text-center p-6">
            <h1 className="text-4xl font-bold mb-4">Моя цифровая книга</h1>
            <div className="relative mx-auto w-40 h-40 bg-white/20 rounded-full flex items-center justify-center transform rotate-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-24 h-24 text-white opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <p className="mt-6">Кликните или удерживайте для открытия</p>
          </div>

          {/* Парольное поле */}
          {showPasswordInput && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
                <h3 className="font-semibold mb-4">Введите пароль</h3>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={() => setShowPasswordInput(false)}
                    className="text-gray-600 hover:text-gray-800"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={submitPassword}
                    className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                  >
                    Войти
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Основной контейнер книги */}
      {currentPage !== null && (
        <div 
          ref={bookRef}
          className={`relative w-[600px] h-[400px] perspective-1000 ${tocVisible ? 'opacity-50' : ''}`}
          onClick={handleLeftClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Обложка книги */}
          <div className={`absolute inset-0 border-4 rounded-xl overflow-hidden shadow-2xl ${
            darkMode 
              ? 'bg-gradient-to-br from-gray-700 to-gray-900 border-gray-600' 
              : 'bg-gradient-to-br from-blue-50 to-white border-blue-200'
          }`}>
            {/* Контент текущей страницы */}
            <div className={`p-8 transform transition-all duration-600 ease-in-out ${isFlipping ? 'scale-95' : 'scale-100'}`}>
              <h2 className={`text-2xl font-semibold mb-4 ${
                darkMode ? 'text-blue-300' : 'text-blue-600'
              }`}>
                {flatPages[currentPage]?.title}
              </h2>

              {/* Редактор или просмотр */}
              {isAdmin && currentPageData?.isEditing ? (
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  dangerouslySetInnerHTML={{ __html: currentPageData.content }}
                  onInput={handleEditorInput}
                  onBlur={() => {
                    const html = editorRef.current.innerHTML;
                    updatePageContent(currentSectionId, currentChapterId, currentPageId, html);
                  }}
                  className={`w-full min-h-40 p-3 border rounded mb-4 outline-none ${
                    darkMode ? 'bg-gray-800 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'
                  }`}
                ></div>
              ) : (
                <div
                  className={`mb-4 ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}
                  dangerouslySetInnerHTML={{ __html: currentPageData?.content || '' }}
                />
              )}

              {/* Кнопки управления */}
              {isAdmin && (
                <button
                  onClick={() => toggleEdit(currentSectionId, currentChapterId, currentPageId)}
                  className="mb-4 text-blue-500 hover:text-blue-600"
                >
                  {currentPageData?.isEditing ? 'Сохранить' : 'Редактировать'}
                </button>
              )}

              {/* Нумерация в самом низу */}
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className={`text-sm font-medium ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  {currentPage + 1} / {flatPages.length}
                </span>
                
                {/* Иконка закладки */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleBookmark(currentPage);
                  }}
                  className="absolute right-6 bottom-4"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 ${
                    bookmarks.includes(currentPage) ? 'text-blue-500' : 'text-gray-400'
                  }`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Левая стрелка */}
          <div className="absolute inset-y-0 left-0 w-6 flex items-center justify-center cursor-pointer opacity-40 hover:opacity-80 transition-opacity">
            {currentPage > 0 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              </svg>
            )}
          </div>

          {/* Правая стрелка */}
          <div className="absolute inset-y-0 right-0 w-6 flex items-center justify-center cursor-pointer opacity-40 hover:opacity-80 transition-opacity">
            {currentPage < flatPages.length - 1 && (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        </div>
      )}

      {/* Оглавление с поиском и анимацией */}
      {tocVisible && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 animate-fadeIn">
          <div className={`pointer-events-auto backdrop-filter backdrop-blur-sm rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto animate-scaleIn ${
            darkMode ? 'bg-gray-800 bg-opacity-95 text-white' : 'bg-white bg-opacity-95 text-gray-800'
          }`}>
            <h2 className={`text-2xl font-bold mb-4 ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`}>Оглавление</h2>

            {/* Кнопка добавления раздела */}
            {isAdmin && (
              <div className="mb-4">
                <button
                  onClick={addNewSection}
                  className="flex items-center gap-1 text-blue-500 hover:text-blue-600"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Добавить раздел
                </button>
              </div>
            )}

            {/* Поиск */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Поиск по книге..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 ${
                  darkMode 
                    ? 'bg-gray-700 text-white focus:ring-blue-500' 
                    : 'bg-gray-100 text-gray-900 focus:ring-blue-400'
                }`}
              />
            </div>
            
            {/* Содержание */}
            <ul className="space-y-1">
              {flatPages.map((page, index) => (
                <li key={index}>
                  <button 
                    onClick={() => goToPage(index)}
                    className={`block w-full text-left px-4 py-2 rounded ${
                      currentPage === index 
                        ? (darkMode ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-900') 
                        : (darkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-700 hover:bg-gray-100')
                    }`}
                  >
                    {page.title} <span className={darkMode ? 'text-gray-500' : 'text-gray-400'}>({index + 1})</span>
                  </button>
                </li>
              ))}
            </ul>

            {/* Закладки */}
            <div className="mt-6">
              <h3 className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Закладки</h3>
              {bookmarks.length === 0 ? (
                <p className={darkMode ? 'text-gray-500' : 'text-gray-500'}>Нет закладок</p>
              ) : (
                <ul className="space-y-2">
                  {bookmarks.map((i) => (
                    <li key={i} className="flex items-center justify-between">
                      <button 
                        onClick={() => goToPage(i)}
                        className={`text-left ${darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'}`}
                      >
                        {flatPages[i]?.title}
                      </button>
                      <button 
                        onClick={() => toggleBookmark(i)}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1H4a1 1 0 00-1 1v3M4 7h16m-1 4v6m-1-6v6" />
                        </svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Закрыть */}
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setTocVisible(false)}
                className={`transition-colors ${
                  darkMode ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно для добавления раздела */}
      {showAddSectionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-xs w-full">
            <h3 className="font-semibold mb-4">Название нового раздела</h3>
            <input
              type="text"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              placeholder="Например: «Теория»"
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShowAddSectionModal(false)}
                className="text-gray-600 hover:text-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={confirmAddSection}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Анимации */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes scaleIn {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}