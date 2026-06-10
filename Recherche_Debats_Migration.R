# Script pour rechercher les mentions de la migration/asile dans les débats parlementaires
# (Bulletin officiel / Amtliches Bulletin)
#
# VERSION 1.0 - Débats parlementaires
# - Recherche dans les transcriptions des débats (table Transcript)
# - Exporte un JSON pour le site web

# Force HTTP/1.1 to avoid curl HTTP/2 framing errors
library(httr)
httr::set_config(httr::config(http_version = 1.1))

packages <- c(
  "dplyr", "swissparl", "stringr", "openxlsx", "jsonlite", "xfun"
)

missing <- packages[!vapply(packages, requireNamespace, logical(1), quietly = TRUE)]

if (length(missing) > 0) {
  stop(
    "Missing packages: ", paste(missing, collapse = ", "),
    "\nInstall them with install.packages().",
    call. = FALSE
  )
}

invisible(lapply(packages, library, character.only = TRUE))

# ============================================================================
# RÉPERTOIRE DE TRAVAIL
# ============================================================================

if (Sys.getenv("CI") == "true") {
  script_dir <- getwd()
} else {
  script_dir <- "/Users/arnaudbonvin/Documents/Windsurf/SwissParlMonitoring"
  setwd(script_dir)
}
cat("Répertoire de travail:", getwd(), "\n\n")

# ============================================================================
# PARAMÈTRES
# ============================================================================

# Toutes les sessions (pour scan complet local)
TOUTES_SESSIONS <- c(
  # Législature 50
  "5001", "5002", "5003", "5004", "5005", "5006", "5007", "5008", "5009", "5010",
  "5011", "5012", "5013", "5014", "5015", "5016", "5017", "5018", "5019",
  # Législature 51
  "5101", "5102", "5103", "5104", "5105", "5106", "5107", "5108", "5109", "5110",
  "5111", "5112", "5113", "5114", "5115", "5116", "5117", "5118", "5119", "5120",
  "5121", "5122",
  # Législature 52
  "5201", "5202", "5203", "5204", "5205", "5206", "5207", "5208", "5209", "5210", "5211",
  "5212", "5213", "5214", "5215", "5216", "5217", "5218"
)

# En mode CI: scanner uniquement la session en cours + session précédente
if (Sys.getenv("CI") == "true") {
  cat("Mode CI détecté: scan limité à la session en cours + précédente\n")
  
  sessions_json <- jsonlite::fromJSON("sessions.json")
  today <- Sys.Date()
  
  sessions_df <- sessions_json$sessions
  sessions_df$start <- as.Date(sessions_df$start)
  sessions_df$end <- as.Date(sessions_df$end)
  
  sessions_avec_code <- sessions_df[!is.na(sessions_df$code) & sessions_df$code != "", ]
  
  date_limite <- today - 30
  sessions_recentes <- sessions_avec_code[
    sessions_avec_code$end >= date_limite | 
    (sessions_avec_code$start <= today & sessions_avec_code$end >= today),
  ]
  
  if (nrow(sessions_recentes) > 0) {
    SESSIONS_DEBATS <- sessions_recentes$code
    cat("Sessions à scanner:", paste(SESSIONS_DEBATS, collapse = ", "), "\n")
  } else {
    sessions_triees <- sessions_avec_code[order(sessions_avec_code$end, decreasing = TRUE), ]
    SESSIONS_DEBATS <- head(sessions_triees$code, 2)
    cat("Aucune session récente, fallback sur:", paste(SESSIONS_DEBATS, collapse = ", "), "\n")
  }
} else {
  SESSIONS_DEBATS <- TOUTES_SESSIONS
  cat("Mode local: scan complet de toutes les sessions\n")
}

# Fichiers de sortie
FICHIER_DEBATS_EXCEL <- "Debats_SEM_Migration.xlsx"
FICHIER_DEBATS_JSON <- "debates_data.json"
FICHIER_NEW_IDS_DEBATS <- "new_ids_debates_tracking.json"
JOURS_NOUVEAUTE <- 4

# ============================================================================
# PATTERNS DE RECHERCHE
# ============================================================================

# Pattern allemand - Migration/Asile
pattern_migration_de <- regex(
  paste0(
    "\\bStaatssekretariat\\s+(f(ü|ue)r)\\s+Migration\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    "|\\bMigrationspolitik\\b",
    "|\\bMigration(s(abkommen|krise|pakt|recht|welle|strom|druck))?\\b",
    "|\\bAusl(ä|ae)nder(recht|gesetz)\\b",
    "|\\bAusl(ä|ae)nder-?\\s*(und\\s+)?Integrationsgesetz\\b",
    "|(?<![a-zA-Z])AIG(?![a-zA-Z])",
    "|\\bAsyl(wesen|verfahren|politik|gesetz|suchende|bewerber|unterkunft|zentrum)?\\b",
    "|(?<![a-zA-Z])AsylG(?![a-zA-Z])",
    "|\\bFl(ü|ue)chtling(e|en|s|sstrom|skrise|sschutz)?\\b",
    "|\\bSchutzstatus\\s*S\\b",
    "|\\bvorl(ä|ae)ufige(n|r)?\\s+Aufnahme\\b",
    "|\\b[NFBC]-Ausweis\\b",
    "|\\bAufenthaltsbewilligung\\b",
    "|\\bNiederlassungsbewilligung\\b",
    "|\\bFamiliennachzug\\b",
    "|\\bEinb(ü|ue)rgerung(en|sgesetz|sverfahren)?\\b",
    "|\\bR(ü|ue)ckkehrhilfe\\b",
    "|\\bR(ü|ue)ckf(ü|ue)hrung(en)?\\b",
    "|\\bWegweisung(en|svollzug)?\\b",
    "|\\bAusschaffung(en|sinitiative)?\\b",
    "|\\bDublin(-Verfahren|-Abkommen|-System)?\\b",
    "|\\bSans-Papiers\\b",
    "|\\bH(ä|ae)rtefall(regelung|kommission|bewilligung|klausel)\\b"
  ),
  ignore_case = TRUE
)

# Pattern français - Migration/Asile
pattern_migration_fr <- regex(
  paste0(
    "\\bSecr(é|e)tariat\\s+d'(É|E)tat\\s+aux\\s+migrations\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    "|\\bmigration(s)?\\b",
    "|\\bpolitique\\s+migratoire\\b",
    "|\\bdroit\\s+des\\s+(é|e)trangers\\b",
    "|(?<![a-zA-Z])LEI(?![a-zA-Z])",
    "|\\basile\\b",
    "|\\bproc(é|e)dure\\s+d'asile\\b",
    "|(?<![a-zA-Z])LAsi(?![a-zA-Z])",
    "|\\brequ(é|e)rant(s|e|es)?\\s+d'asile\\b",
    "|\\br(é|e)fugi(é|e)(s|es)?\\b",
    "|\\bstatut\\s+de\\s+protection\\s+S\\b",
    "|\\badmission\\s+provisoire\\b",
    "|\\b(permis|livret)\\s+[NFBC]\\b",
    "|\\bregroupement\\s+familial\\b",
    "|\\bnaturalisation(s)?\\b",
    "|\\baide\\s+au\\s+retour\\b",
    "|(?<!pas\\s(un|de|le|du)\\s)\\brenvoi(s)?(?!\\s+(en\\s+commission|du\\s+(contre[- ])?projet|au\\s+Conseil|à\\s+la\\s+commission|du\\s+rapport|de\\s+la\\s+motion|de\\s+l['](initiative|interpellation|objet)))\\b",
    "|\\bexpulsion(s)?\\b",
    "|\\bDublin\\b",
    "|\\bsans-papiers\\b"
  ),
  ignore_case = TRUE
)

# Pattern italien - Migration/Asile
pattern_migration_it <- regex(
  paste0(
    "\\bSegreteria\\s+di\\s+Stato\\s+della\\s+migrazione\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    "|\\bmigrazione\\b",
    "|(?<![a-zA-Z])LStrI(?![a-zA-Z])",
    "|\\basilo\\b",
    "|(?<![a-zA-Z])LAsi(?![a-zA-Z])",
    "|\\brifugiat[ie]\\b",
    "|\\bstatuto\\s+di\\s+protezione\\s+S\\b",
    "|\\bammissione\\s+provvisoria\\b",
    "|\\bricongiungimento\\s+familiare\\b",
    "|\\bnaturalizzazione\\b",
    "|\\bDublino\\b",
    "|\\bsans-papiers\\b"
  ),
  ignore_case = TRUE
)

# ============================================================================
# RECHERCHE DES DÉBATS
# ============================================================================

cat("============================================\n")
cat("RECHERCHE DES DÉBATS PARLEMENTAIRES\n")
cat("============================================\n\n")

Debats_Tous <- NULL

for (session_id in SESSIONS_DEBATS) {
  cat("Session", session_id, ":\n")
  
  # Recherche en allemand
  cat("  Recherche DE...")
  Debats_DE <- tryCatch({
    get_data(table = "Transcript", Language = "DE", IdSession = session_id) |>
      filter(!is.na(Text)) |>
      mutate(Text = strip_html(Text)) |>
      filter(str_detect(Text, pattern_migration_de)) |>
      mutate(Langue = "DE") |>
      select(
        ID, IdSession, IdSubject, SortOrder, MeetingDate, MeetingCouncilAbbreviation, 
        SpeakerFullName, SpeakerFunction, ParlGroupAbbreviation, CantonAbbreviation,
        Text, Langue, Start, End
      )
  }, error = function(e) {
    cat(" erreur:", e$message, "\n")
    NULL
  })
  
  if (!is.null(Debats_DE) && nrow(Debats_DE) > 0) {
    cat(" ", nrow(Debats_DE), "trouvés\n")
  } else {
    cat(" 0 trouvés\n")
    Debats_DE <- NULL
  }
  
  # Recherche en français
  cat("  Recherche FR...")
  Debats_FR <- tryCatch({
    get_data(table = "Transcript", Language = "FR", IdSession = session_id) |>
      filter(!is.na(Text)) |>
      mutate(Text = strip_html(Text)) |>
      filter(str_detect(Text, pattern_migration_fr)) |>
      mutate(Langue = "FR") |>
      select(
        ID, IdSession, IdSubject, SortOrder, MeetingDate, MeetingCouncilAbbreviation, 
        SpeakerFullName, SpeakerFunction, ParlGroupAbbreviation, CantonAbbreviation,
        Text, Langue, Start, End
      )
  }, error = function(e) {
    cat(" erreur:", e$message, "\n")
    NULL
  })
  
  if (!is.null(Debats_FR) && nrow(Debats_FR) > 0) {
    cat(" ", nrow(Debats_FR), "trouvés\n")
  } else {
    cat(" 0 trouvés\n")
    Debats_FR <- NULL
  }
  
  # Recherche en italien
  cat("  Recherche IT...")
  Debats_IT <- tryCatch({
    get_data(table = "Transcript", Language = "IT", IdSession = session_id) |>
      filter(!is.na(Text)) |>
      mutate(Text = strip_html(Text)) |>
      filter(str_detect(Text, pattern_migration_it)) |>
      mutate(Langue = "IT") |>
      select(
        ID, IdSession, IdSubject, SortOrder, MeetingDate, MeetingCouncilAbbreviation, 
        SpeakerFullName, SpeakerFunction, ParlGroupAbbreviation, CantonAbbreviation,
        Text, Langue, Start, End
      )
  }, error = function(e) {
    cat(" erreur:", e$message, "\n")
    NULL
  })
  
  if (!is.null(Debats_IT) && nrow(Debats_IT) > 0) {
    cat(" ", nrow(Debats_IT), "trouvés\n")
  } else {
    cat(" 0 trouvés\n")
    Debats_IT <- NULL
  }
  
  session_debats <- bind_rows(Debats_DE, Debats_FR, Debats_IT)
  Debats_Tous <- bind_rows(Debats_Tous, session_debats)
}

# Dédoublonner par ID
if (!is.null(Debats_Tous) && nrow(Debats_Tous) > 0) {
  Debats_Tous <- Debats_Tous |>
    distinct(ID, .keep_all = TRUE)
}

cat("\nTotal débats scannés:", nrow(Debats_Tous), "\n")

# En mode CI: fusionner avec les données existantes
if (Sys.getenv("CI") == "true" && file.exists(FICHIER_DEBATS_JSON)) {
  cat("Fusion avec les données existantes...\n")
  ancien_json <- jsonlite::fromJSON(FICHIER_DEBATS_JSON)
  
  if (!is.null(ancien_json$items) && length(ancien_json$items) > 0) {
    anciens_debats <- as_tibble(ancien_json$items)
    
    sessions_scannees <- SESSIONS_DEBATS
    anciens_autres_sessions <- anciens_debats |>
      filter(!id_session %in% sessions_scannees)
    
    cat("  -> Débats existants (autres sessions):", nrow(anciens_autres_sessions), "\n")
    cat("  -> Débats scannés (sessions récentes):", nrow(Debats_Tous), "\n")
  }
}

# Récupérer les infos sur les objets parlementaires via SubjectBusiness
cat("Récupération des infos sur les objets parlementaires...\n")
subject_ids <- unique(Debats_Tous$IdSubject)
cat("  ->", length(subject_ids), "sujets uniques à enrichir\n")

SubjectBusiness_All <- NULL
for (sid in subject_ids) {
  sb <- tryCatch({
    result_fr <- get_data(table = "SubjectBusiness", Language = "FR", IdSubject = as.integer(sid))
    title_fr <- if(nrow(result_fr) > 0 && "Title" %in% names(result_fr)) result_fr$Title[1] else NA_character_
    
    result_de <- get_data(table = "SubjectBusiness", Language = "DE", IdSubject = as.integer(sid))
    title_de <- if(nrow(result_de) > 0 && "Title" %in% names(result_de)) result_de$Title[1] else NA_character_
    
    result_it <- get_data(table = "SubjectBusiness", Language = "IT", IdSubject = as.integer(sid))
    title_it <- if(nrow(result_it) > 0 && "Title" %in% names(result_it)) result_it$Title[1] else NA_character_
    
    base_result <- if(nrow(result_fr) > 0) result_fr else result_de
    
    dept <- NA_character_
    if(nrow(base_result) > 0 && !is.na(base_result$BusinessNumber[1])) {
      business_info <- tryCatch({
        get_data(table = "Business", ID = base_result$BusinessNumber[1], Language = "DE")
      }, error = function(e) NULL)
      if(!is.null(business_info) && nrow(business_info) > 0 && "ResponsibleDepartmentAbbreviation" %in% names(business_info)) {
        dept <- business_info$ResponsibleDepartmentAbbreviation[1]
      }
    }
    
    if(nrow(base_result) > 0) {
      tibble(
        IdSubject = base_result$IdSubject[1],
        BusinessNumber = base_result$BusinessNumber[1],
        BusinessShortNumber = base_result$BusinessShortNumber[1],
        TitleFR = title_fr,
        TitleDE = title_de,
        TitleIT = title_it,
        Department = dept
      )
    } else {
      NULL
    }
  }, error = function(e) {
    cat("    Erreur pour sujet", sid, ":", conditionMessage(e), "\n")
    NULL
  })
  if (!is.null(sb)) {
    SubjectBusiness_All <- bind_rows(SubjectBusiness_All, sb)
  }
  Sys.sleep(0.1)
}

cat("  ->", if(!is.null(SubjectBusiness_All)) nrow(SubjectBusiness_All) else 0, "sujets avec infos business\n")

if (!is.null(SubjectBusiness_All) && nrow(SubjectBusiness_All) > 0) {
  SubjectBusiness_All <- SubjectBusiness_All |>
    mutate(IdSubject = as.character(IdSubject))
  
  Debats_Tous <- Debats_Tous |>
    left_join(SubjectBusiness_All, by = "IdSubject")
  cat("  -> Infos objets ajoutées pour", sum(!is.na(Debats_Tous$BusinessShortNumber)), "débats\n")
} else {
  Debats_Tous <- Debats_Tous |>
    mutate(
      BusinessNumber = NA_integer_,
      BusinessShortNumber = NA_character_,
      TitleFR = NA_character_,
      TitleDE = NA_character_,
      TitleIT = NA_character_,
      Department = NA_character_
    )
}

cat("\n")

# ============================================================================
# EXPORT
# ============================================================================

if (!is.null(Debats_Tous) && nrow(Debats_Tous) > 0) {
  
  # Export Excel
  cat("Export Excel...\n")
  Debats_Export <- Debats_Tous |>
    mutate(
      Extrait = str_sub(Text, 1, 500)
    ) |>
    select(ID, MeetingDate, MeetingCouncilAbbreviation, SpeakerFullName, ParlGroupAbbreviation, 
           CantonAbbreviation, Langue, Extrait, Text) |>
    arrange(MeetingDate, MeetingCouncilAbbreviation)
  
  wb_debats <- createWorkbook()
  addWorksheet(wb_debats, "Débats-Migration")
  writeDataTable(wb_debats, "Débats-Migration", Debats_Export)
  saveWorkbook(wb_debats, file = FICHIER_DEBATS_EXCEL, overwrite = TRUE)
  cat("  ->", FICHIER_DEBATS_EXCEL, "\n")
  
  # Export JSON
  cat("Export JSON...\n")
  Debats_JSON_Nouveaux <- Debats_Tous |>
    transmute(
      id = ID,
      id_subject = IdSubject,
      id_session = IdSession,
      sort_order = SortOrder,
      date = as.character(MeetingDate),
      council = MeetingCouncilAbbreviation,
      speaker = SpeakerFullName,
      function_speaker = SpeakerFunction,
      party = ParlGroupAbbreviation,
      canton = CantonAbbreviation,
      affair_id = as.character(BusinessNumber),
      business_number = BusinessShortNumber,
      business_title_fr = coalesce(TitleFR, TitleDE),
      business_title_de = coalesce(TitleDE, TitleFR),
      business_title_it = coalesce(TitleIT, TitleFR),
      department = Department,
      text = Text,
      language = Langue
    )
  
  ids_existants <- c()
  Debats_JSON <- Debats_JSON_Nouveaux
  
  if (file.exists(FICHIER_DEBATS_JSON)) {
    ancien_json <- jsonlite::fromJSON(FICHIER_DEBATS_JSON)
    if (!is.null(ancien_json$items) && length(ancien_json$items) > 0) {
      ids_existants <- ancien_json$items$id
      
      if (Sys.getenv("CI") == "true") {
        anciens_items <- as_tibble(ancien_json$items)
        anciens_autres <- anciens_items |>
          filter(!id_session %in% SESSIONS_DEBATS)
        
        Debats_JSON <- bind_rows(anciens_autres, Debats_JSON_Nouveaux) |>
          distinct(id, .keep_all = TRUE)
        
        cat("  -> Fusion: ", nrow(anciens_autres), " anciens + ", nrow(Debats_JSON_Nouveaux), " scannés = ", nrow(Debats_JSON), " total\n")
      }
    }
  }
  
  nouveaux_ids <- setdiff(Debats_JSON$id, ids_existants)
  cat("  -> Nouveaux débats détectés:", length(nouveaux_ids), "\n")
  
  # Charger le suivi existant des new_ids
  new_ids_tracking <- if (file.exists(FICHIER_NEW_IDS_DEBATS)) {
    jsonlite::fromJSON(FICHIER_NEW_IDS_DEBATS)
  } else {
    list()
  }
  
  if (is.list(new_ids_tracking) && length(new_ids_tracking) > 0) {
    new_ids_df <- tibble(
      id = names(new_ids_tracking),
      date_added = as.Date(unlist(new_ids_tracking))
    )
  } else {
    new_ids_df <- tibble(id = character(0), date_added = as.Date(character(0)))
  }
  
  date_limite_nouveaute <- Sys.Date() - JOURS_NOUVEAUTE
  new_ids_df <- new_ids_df |>
    filter(date_added >= date_limite_nouveaute)
  
  if (length(nouveaux_ids) > 0) {
    for (nid in nouveaux_ids) {
      if (!nid %in% new_ids_df$id) {
        new_ids_df <- bind_rows(new_ids_df, tibble(id = as.character(nid), date_added = Sys.Date()))
      }
    }
  }
  
  new_ids_list <- setNames(as.list(as.character(new_ids_df$date_added)), new_ids_df$id)
  jsonlite::write_json(new_ids_list, FICHIER_NEW_IDS_DEBATS, auto_unbox = TRUE, pretty = TRUE)
  cat("  -> Nouveautés actives:", nrow(new_ids_df), "(", JOURS_NOUVEAUTE, "jours)\n")
  
  vrais_nouveaux_ids <- new_ids_df$id
  
  jsonlite::write_json(
    list(
      meta = list(
        sessions = paste(SESSIONS_DEBATS, collapse = ", "),
        count = nrow(Debats_JSON),
        updated = as.character(Sys.time())
      ),
      new_ids = vrais_nouveaux_ids,
      items = Debats_JSON
    ),
    FICHIER_DEBATS_JSON,
    auto_unbox = TRUE,
    pretty = TRUE
  )
  cat("  ->", FICHIER_DEBATS_JSON, "\n")
  
  # ============================================================================
  # RÉSUMÉ
  # ============================================================================
  
  cat("\n============================================\n")
  cat("RÉSUMÉ\n")
  cat("============================================\n")
  cat("Sessions analysées:", paste(SESSIONS_DEBATS, collapse = ", "), "\n")
  cat("Total débats:", nrow(Debats_Tous), "\n")
  cat("\nPar conseil:\n")
  print(table(Debats_Tous$MeetingCouncilAbbreviation))
  cat("\nPar groupe:\n")
  print(table(Debats_Tous$ParlGroupAbbreviation))
  cat("\nFichiers exportés:\n")
  cat(" -", FICHIER_DEBATS_EXCEL, "\n")
  cat(" -", FICHIER_DEBATS_JSON, "\n")
  cat("\n⚠️  N'oubliez pas de commit/push sur GitHub!\n")
  
} else {
  cat("Aucun nouveau débat trouvé pour les sessions scannées.\n")
  
  if (Sys.getenv("CI") == "true" && file.exists(FICHIER_DEBATS_JSON)) {
    cat("Mise à jour de meta.updated...\n")
    ancien_json <- jsonlite::fromJSON(FICHIER_DEBATS_JSON, simplifyVector = FALSE)
    ancien_json$meta$sessions <- paste(SESSIONS_DEBATS, collapse = ", ")
    ancien_json$meta$updated <- as.character(Sys.time())
    jsonlite::write_json(ancien_json, FICHIER_DEBATS_JSON, auto_unbox = TRUE, pretty = TRUE)
    cat("  -> meta.updated mis à jour dans", FICHIER_DEBATS_JSON, "\n")
  }
}
