## Releasing runsearch

המאגר: `giamat13/runsearch`. ענף ברירת המחדל: `main`. מספר הגרסה נמצא ב-`package.json` (השדה `version`), וזה המקור היחיד שלו. פורמט התגית: `vX.Y.Z`. קובץ ה-workflow לשחרור: `.github/workflows/release.yml`.

## כללים

1. **לא משחררים לפני שהשינוי ידוע כעובד.** בדיקות יחידה לא מספיקות: בונים את קובץ ה-portable, מפעילים אותו, ובודקים שמסך החיפוש נפתח עם `Alt+Space` ושאייקון המגש עובד.
2. משחררים רק מ-`main`, ישירות מענף ברירת המחדל. בלי ענפי פיתוח לשחרורים.
3. לא משחררים מעל הרצה ב-CI שידוע כאדומה.
4. שחרור שגוי לא נמחק. מוציאים גרסת patch חדשה שמתקנת אותו.
5. ה-token תמיד מגיע מ-`git credential fill` (או `gh auth`), לא מודפס ולא נכתב לקובץ.

## מספרי גרסה

סמנטי: `MAJOR.MINOR.PATCH`, תמיד שלושת החלקים.

- MAJOR: שינוי שובר, למשל פורמט הגדרות שגרסאות ישנות לא יכולות לקרוא.
- MINOR: פלאגין חדש או אפשרות חדשה.
- PATCH: תיקון באג בלבד.

בכל שחרור עולה רק מספר אחד (השינוי הגדול ביותר בו), והחלקים שאחריו מתאפסים ל-0. קומיט שנכנס אחרי שחרור מחייב גרסה חדשה.

אין גרסאות טרום-שחרור (pre-release).

## הערות שחרור

קובץ: `docs/release-notes-vX.Y.Z.md`. הוא הופך לגוף ה-Release ב-GitHub. הקובץ נכתב באנגלית, כי הקוראים הם אנשים שמורידים את התוכנה מ-GitHub. הסעיפים לפי הסדר הבא, בלי סעיפים ריקים: `Features` (לגרסה MAJOR או MINOR), `Fixes`.

## עדכון אוטומטי

התוכנה מעדכנת את עצמה מה-releases של GitHub, בעזרת `electron-updater` (ספק GitHub; המאגר ציבורי, אז אין צורך ב-token).

- הבדיקה: בהפעלה, ברקע, לכל היותר פעם ביום (הזמן האחרון נשמר ב-`updates.json`). אפשר גם מהמגש: `Check for updates`. גרסה חדשה מורדת ברקע, ומותקנת כשהתוכנה נסגרת. בהורדה נשלחת התראה, ובמגש מופיע `Restart to install`.
- רק המתקין (`runsearch-X.Y.Z-setup.exe`) מתעדכן. גרסת ה-portable לא מתעדכנת לבד ולא נבדקת.
- האימות: `electron-updater` בודק את ה-SHA-512 שב-`latest.yml`. לכן ה-release חייב לכלול את `latest.yml`, את `runsearch-X.Y.Z-setup.exe` ואת `runsearch-X.Y.Z-setup.exe.blockmap`. ה-workflow בודק שהקבצים קיימים לפני הפרסום.
- אחרי הפרסום (שלב 10) בודקים ש-`gh api repos/giamat13/runsearch/releases/latest --jq .tag_name` מחזיר את התגית החדשה, ושב-Release יש `latest.yml` ו-setup.

## דשבורד השחרור

עמוד מקומי חי (`tools/release_status/status.html`) שמציג את אחוז ההתקדמות, הזמן שנותר, מה קורה עכשיו, השלבים, יומן חי, המשימות, משימות GitHub והבדיקות המקומיות. הוא רק קורא: הוא לעולם לא דוחף או משחרר.

- הפעלה ברקע: `python tools/release_status/status_page.py`. הוא רץ עד שהגרסה מתפרסמת, לכל היותר 3 שעות. פותחים את `tools/release_status/status.html`.
- שמירה על עדכניות: `python tools/release_status/log.py "מה אני עושה עכשיו"` בכל שלב. לכתוב מחדש את `tools/release_status/todo.json` (`[{"text": "...", "state": "todo|run|done"}]`) כשמשימה מתחילה או נגמרת.
- ניקוי: `python tools/release_status/reset.py`.
- בתחילת סשן בודקים שהוא חי: `status-data.js` השתנה בדקה האחרונה.

## בדיקות מקומיות

`python tools/release_status/run_local_tests.py` מריץ את הסט שב-`DEFAULT` (שמות הקבצים בתיקייה `test/` בלי `.test.js`) וכותב `local-tests.json`, שהדשבורד מציג. `python tools/release_status/run_local_tests.py calculator` מריץ רק את הבדיקה הזו; בדיקה בודדת מוצגת בכרטיס משלה.

- לבדיקות אין פורטים משותפים ואין קבצים משותפים, ולכן הן רצות בו-זמנית. `--serial` מריץ אותן אחת אחרי השנייה.
- מעבירים רק שמות בדיקות, `--serial` או `--parallel N`. כל מילה אחרת נחשבת לשם בדיקה ומופיעה ככישלון.
- קובץ בדיקה חדש נכנס ל-`test/<name>.test.js` **וגם** השם שלו נכנס ל-`DEFAULT` ב-`run_local_tests.py`. ה-CI מריץ `npm test`, שתופס לבד כל `test/*.test.js`.
- **עוצרים בכשל הראשון.** מריצים ברקע `python tools/release_status/watch_tests.py`. הוא מתחיל את ההרצה, קורא את ההתקדמות כל 3 שניות, ובכשל הראשון עוצר את ההרצה ויוצא עם קוד 1. כש-הכול עבר הוא מדפיס `FINISHED OK`. מתקנים, ומריצים הכול מחדש מההתחלה.
- בדיקה שנכשלה בהרצה המלאה מורצת שוב לבד לפני שהיא נחשבת כשבורה.
- לא מתחילים הרצה שנייה בזמן שאחת רצה.

## תהליך

1. מעדכנים את הדשבורד (`todo.json`, `log.py`).
2. אוספים מה נכנס: `git log <התגית-האחרונה>..HEAD --oneline` (או `git log --oneline` אם אין תגית עדיין). קובעים את מספר הגרסה.
3. מגדירים `version` ב-`package.json` וכותבים את `docs/release-notes-vX.Y.Z.md`.
4. בודקים את השינוי באמת: `npm run dist`, ואז מפעילים את `dist\runsearch-X.Y.Z-portable.exe`. מסך החיפוש חייב להיפתח עם `Alt+Space`, ותפריט המגש חייב להציג Show, Settings, Start with Windows ו-Quit.
5. מריצים את הבדיקות המקומיות עם ה-watcher (למעלה).
6. עושים commit ו-push ל-`main`. מחכים עד ש-`git status -sb` לא מציג "ahead".
7. בודקים שהתגית עדיין לא קיימת: `git ls-remote --tags origin vX.Y.Z` חייב להחזיר ריק.
8. מפעילים את השחרור: `gh workflow run release.yml --ref main`. לא דוחפים תגית ידנית: ה-workflow קורא את הגרסה, יוצר את התגית, בונה ומפרסם.
9. עוקבים: `python tools/release_status/watch_release.py giamat13/runsearch release.yml` ברקע. הוא יוצא עם קוד 1 בכשל הראשון. אז קוראים את הלוג עם `gh run view <run-id> --log-failed`, מבטלים את ההרצה עם `gh run cancel <run-id>`, מתקנים, דוחפים ומפעילים את השחרור שוב.
10. אחרי הצלחה בודקים שב-Release יש את הקבצים: `runsearch-X.Y.Z-setup.exe`, `runsearch-X.Y.Z-setup.exe.blockmap`, `runsearch-X.Y.Z-portable.exe`, `latest.yml`, ושגוף ה-Release הוא הערות השחרור. ואז בודקים את `releases/latest` (ראו "עדכון אוטומטי").
11. בעיות שהגרסה מתקנת: מוסיפים הערה עם מספר הגרסה, ואז סוגרים אותן.
12. מסיימים את הדשבורד: כל המשימות ב-`todo.json` במצב `done`, ושורה אחרונה ביומן.

הדשבורד מציג כמה זמן ייקח השחרור, לפי השחרורים הקודמים.

## התאוששות משחרור שגוי

מוציאים גרסת patch חדשה שמתקנת את הבעיה, עם התהליך הזה מההתחלה. לא מוחקים release שפורסם.

## בעיות נפוצות

| תסמין | פעולה |
|---|---|
| הדשבורד מציג "everything failed" | `local-tests.json` ישן מהרצה שנהרגה: למחוק אותו |
| `git push` של תגית נכשל | לא דוחפים תגיות; מפעילים את ה-workflow עם `gh workflow run` |
| ה-API מחזיר 401 | `git credential fill` החזיר סיסמה ריקה: להתחבר שוב ל-git |
| הטיימר של הדשבורד עצר | משימה ב-GitHub נכשלה; הטיימר עוצר בכשל הראשון |
