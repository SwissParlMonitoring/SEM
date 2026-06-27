# Script pour trouver les interpellations, motions, questions et postulats
# mentionnant le SEM, la migration et l'asile
# en allemand, français et italien
#
# VERSION 1.0 - Recherche incrémentale
# - Charge les données existantes depuis l'Excel
# - Ne recherche que les interventions des 6 derniers mois
# - Met à jour l'Excel avec les nouvelles interventions
# - Exporte un JSON pour GitHub

# Force HTTP/1.1 to avoid curl HTTP/2 framing errors
library(httr)
httr::set_config(httr::config(http_version = 1.1))

packages <- c(
  "dplyr", "swissparl", "stringr", "openxlsx", "tidyr", "xfun", "jsonlite", "lubridate"
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

Legislaturen <- c(50, 51, 52)  # 50ème (2015-2019), 51ème (2019-2023) et 52ème (2023-)
MOIS_MISE_A_JOUR <- 6
Geschaeftstyp <- c(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13, 14, 18, 19)

FICHIER_EXCEL <- "Objets_parlementaires_SEM_Migration.xlsx"
FICHIER_JSON <- "sem_migration_data.json"
FICHIER_NEW_IDS <- "new_ids_tracking.json"  # Suivi des nouveautés avec dates
JOURS_NOUVEAUTE <- 4  # Durée d'affichage des marques vertes
GITHUB_RAW_URL <- "https://raw.githubusercontent.com/SwissParlMonitoring/SEM/main/sem_migration_data.json"

# Objets à exclure (faux positifs)
faux_positifs <- c()

# ============================================================================
# PATTERNS DE RECHERCHE - ALLEMAND (DE)
# ============================================================================

# Mots-clés liés au SEM, à la migration et à l'asile en allemand
pattern_migration_de <- regex(
  paste0(
    # SEM / Staatssekretariat für Migration
    "\\bStaatssekretariat\\s+(f(ü|ue)r)\\s+Migration\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    # Migration
    "|\\bMigrationspolitik\\b",
    "|\\bMigration(s(abkommen|krise|pakt|recht|welle|strom|druck|partnerschaft))?\\b",
    # Ausländerrecht / AIG
    "|\\bAusl(ä|ae)nder(recht|gesetz)\\b",
    "|\\bAusl(ä|ae)nder-?\\s*(und\\s+)?Integrationsgesetz\\b",
    "|(?<![a-zA-Z])AIG(?![a-zA-Z])",
    # Asyl
    "|\\bAsyl(wesen|verfahren|politik|gesetz|suchende|bewerber|unterkunft|zentrum)?\\b",
    "|(?<![a-zA-Z])AsylG(?![a-zA-Z])",
    # Flüchtlinge
    "|\\bFl(ü|ue)chtling(e|en|s|sstrom|skrise|sschutz)?\\b",
    # Schutzstatus S
    "|\\bSchutzstatus\\s*S\\b",
    # vorläufige Aufnahme
    "|\\bvorl(ä|ae)ufige(n|r)?\\s+Aufnahme\\b",
    # Ausweis-Typen
    "|\\b[NFBC]-Ausweis\\b",
    # Bewilligungen
    "|\\bAufenthaltsbewilligung\\b",
    "|\\bNiederlassungsbewilligung\\b",
    "|\\bArbeitsbewilligung\\b",
    # Familiennachzug
    "|\\bFamiliennachzug\\b",
    # Einbürgerung / Bürgerrecht
    "|\\bEinb(ü|ue)rgerung(en|sgesetz|sverfahren)?\\b",
    "|\\bSchweizer\\s+B(ü|ue)rgerrecht\\b",
    "|\\bB(ü|ue)rgerrechtsgesetz\\b",
    # Rückkehr / Rückführung / Wegweisung / Ausschaffung
    "|\\bR(ü|ue)ckkehrhilfe\\b",
    "|\\bR(ü|ue)ckf(ü|ue)hrung(en|sabkommen)?\\b",
    "|\\bWegweisung(en|svollzug)?\\b",
    "|\\bAusschaffung(en|sinitiative)?\\b",
    # Dublin
    "|\\bDublin(-Verfahren|-Abkommen|-System)?\\b",
    # Schengen
    "|\\bSchengen(-Raum|-Visum|-Abkommen)?\\b",
    # Visum
    "|\\bVisum\\b|\\bVisa\\b",
    # Sans-Papiers
    "|\\bSans-Papiers\\b",
    # Härtefallregelung
    "|\\bH(ä|ae)rtefall(regelung|kommission|bewilligung|gesuche|klausel)\\b"
  ),
  ignore_case = TRUE
)

# ============================================================================
# PATTERNS DE RECHERCHE - FRANÇAIS (FR)
# ============================================================================

pattern_migration_fr <- regex(
  paste0(
    # SEM / Secrétariat d'État aux migrations
    "\\bSecr(é|e)tariat\\s+d'(É|E)tat\\s+aux\\s+migrations\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    # Migration
    "|\\bmigration(s)?\\b",
    "|\\bpolitique\\s+migratoire\\b",
    # LEI / Droit des étrangers
    "|\\bdroit\\s+des\\s+(é|e)trangers\\b",
    "|\\b[Ll]oi\\s+(f(é|e)d(é|e)rale\\s+)?sur\\s+les\\s+(é|e)trangers\\b",
    "|(?<![a-zA-Z])LEI(?![a-zA-Z])",
    "|(?<![a-zA-Z])LEtr(?![a-zA-Z])",
    # Asile
    "|\\basile\\b",
    "|\\bproc(é|e)dure\\s+d'asile\\b",
    "|\\bpolitique\\s+d'asile\\b",
    "|\\bloi\\s+sur\\s+l'asile\\b",
    "|(?<![a-zA-Z])LAsi(?![a-zA-Z])",
    "|\\brequ(é|e)rant(s|e|es)?\\s+d'asile\\b",
    # Réfugiés
    "|\\br(é|e)fugi(é|e)(s|es)?\\b",
    # Statut de protection S
    "|\\bstatut\\s+de\\s+protection\\s+S\\b",
    # Admission provisoire
    "|\\badmission\\s+provisoire\\b",
    # Permis / Livrets
    "|\\b(permis|livret)\\s+[NFBC]\\b",
    # Autorisations
    "|\\bautorisation\\s+de\\s+s(é|e)jour\\b",
    "|\\bautorisation\\s+d'(é|e)tablissement\\b",
    "|\\bpermis\\s+de\\s+travail\\b",
    "|\\bautorisation\\s+de\\s+travail\\b",
    # Regroupement familial
    "|\\bregroupement\\s+familial\\b",
    # Naturalisation
    "|\\bnaturalisation(s)?\\b",
    "|\\bdroit\\s+de\\s+cit(é|e)\\s+suisse\\b",
    "|\\bloi\\s+sur\\s+la\\s+nationalit(é|e)\\b",
    # Aide au retour / Renvoi / Expulsion
    "|\\baide\\s+au\\s+retour\\b",
    "|\\brenvoi(s)?(?!\\s+(en\\s+commission|du\\s+(contre[- ])?projet|au\\s+Conseil|à\\s+la\\s+commission|du\\s+rapport|de\\s+la\\s+motion|de\\s+l['](initiative|interpellation|objet)))\\b",
    "|\\bexpulsion(s)?\\b",
    # Dublin
    "|\\bDublin\\b",
    "|\\baccords?\\s+de\\s+Dublin\\b",
    # Schengen
    "|\\bSchengen\\b",
    # Visa
    "|\\bvisa(s)?\\b",
    # Sans-papiers
    "|\\bsans-papiers\\b"
  ),
  ignore_case = TRUE
)

# ============================================================================
# PATTERNS DE RECHERCHE - ITALIEN (IT)
# ============================================================================

pattern_migration_it <- regex(
  paste0(
    # SEM / Segreteria di Stato della migrazione
    "\\bSegreteria\\s+di\\s+Stato\\s+della\\s+migrazione\\b",
    "|(?<![a-zA-Z])SEM(?![a-zA-Z])",
    # Migrazione
    "|\\bmigrazione\\b",
    "|\\bpolitica\\s+migratoria\\b",
    # LStrI / Diritto degli stranieri
    "|\\bLegge\\s+sugli\\s+stranieri\\b",
    "|(?<![a-zA-Z])LStrI(?![a-zA-Z])",
    # Asilo
    "|\\basilo\\b",
    "|\\bprocedura\\s+d'asilo\\b",
    "|\\blegge\\s+sull'asilo\\b",
    "|(?<![a-zA-Z])LAsi(?![a-zA-Z])",
    "|\\brichiedent[ie]\\s+l'asilo\\b",
    # Rifugiati
    "|\\brifugiat[ie]\\b",
    "|\\bprofugh[ie]\\b",
    # Statuto di protezione S
    "|\\bstatuto\\s+di\\s+protezione\\s+S\\b",
    # Ammissione provvisoria
    "|\\bammissione\\s+provvisoria\\b",
    # Permessi
    "|\\bpermesso\\s+[NFBC]\\b",
    "|\\bpermesso\\s+di\\s+dimora\\b",
    "|\\bpermesso\\s+di\\s+domicilio\\b",
    "|\\bpermesso\\s+di\\s+lavoro\\b",
    # Ricongiungimento familiare
    "|\\bricongiungimento\\s+familiare\\b",
    # Naturalizzazione
    "|\\bnaturalizzazione\\b",
    "|\\bcittadinanza\\s+svizzera\\b",
    # Aiuto al ritorno / Allontanamento / Espulsione
    "|\\baiuto\\s+al\\s+ritorno\\b",
    "|\\ballontanamento\\b",
    "|\\bespulsione\\b",
    # Dublin
    "|\\bDublino\\b",
    # Schengen
    "|\\bSchengen\\b",
    # Visto
    "|\\bvisto\\b",
    # Sans-papiers
    "|\\bsans-papiers\\b"
  ),
  ignore_case = TRUE
)

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

na0 <- function(x) if_else(is.na(x), "", x)

est_titre_manquant <- function(titre) {
  if (is.na(titre) || titre == "") return(TRUE)
  return(tolower(trimws(titre)) %in% c("titre suit", "titel folgt", "titolo segue"))
}

concatener_textes <- function(df) {
  df |>
    mutate(
      Text = str_c(
        na0(Title),
        na0(SubmittedText),
        na0(ReasonText),
        na0(FederalCouncilResponseText),
        sep = " "
      ),
      Text = strip_html(Text)
    )
}

# Normaliser les noms de partis (groupes parlementaires -> sigle du parti)
normaliser_parti <- function(parti) {
  if (is.na(parti) || parti == "") return(parti)
  
  mapping <- c(
    # Verts
    "Al" = "VERT-E-S",
    "Grüne Fraktion" = "VERT-E-S",
    "Les Vert-e-s" = "VERT-E-S",
    "Grüne" = "VERT-E-S",
    # PS
    "PSS" = "PS",
    "Sozialdemokratische Fraktion" = "PS",
    "SP" = "PS",
    # Centre
    "M-E" = "Le Centre",
    "PDC" = "Le Centre",
    "PBD" = "Le Centre",
    "CSPO" = "Le Centre",
    "CVP" = "Le Centre",
    "BDP" = "Le Centre",
    "Fraktion der Mitte" = "Le Centre",
    "Die Mitte-Fraktion. Die Mitte. EVP." = "Le Centre",
    "Die Mitte" = "Le Centre",
    "Mitte" = "Le Centre",
    # PLR
    "FDP-Liberale Fraktion" = "PLR",
    "FDP" = "PLR",
    # UDC
    "SVP-Fraktion" = "UDC",
    "SVP" = "UDC",
    "Fraktion der Schweizerischen Volkspartei" = "UDC",
    # Vert'libéraux
    "Grünliberale Fraktion" = "pvl",
    "GLP" = "pvl",
    # Indépendant
    "-" = "Indépendant"
  )
  
  if (parti %in% names(mapping)) {
    return(mapping[parti])
  }
  return(parti)
}

# Corrections spécifiques pour parlementaires indépendants
corriger_partis_speciaux <- function(df) {
  df |>
    mutate(Parti = case_when(
      # Thomas Minder: toujours indépendant
      grepl("Minder Thomas", Auteur) ~ "Indépendant",
      # Daniel Jositsch: PS jusqu'au 7.6.2026, ensuite indépendant
      grepl("Jositsch Daniel", Auteur) & Date_dépôt > "2026-06-07" ~ "Indépendant",
      grepl("Jositsch Daniel", Auteur) & Date_dépôt <= "2026-06-07" ~ "PS",
      TRUE ~ Parti
    ))
}

# ============================================================================
# CHARGER LES DONNÉES EXISTANTES
# ============================================================================

Donnees_Existantes <- NULL
IDs_Existants <- c()

if (file.exists(FICHIER_EXCEL)) {
  cat("Chargement des données existantes depuis", FICHIER_EXCEL, "...\n")
  Donnees_Existantes <- read.xlsx(FICHIER_EXCEL, detectDates = TRUE)
  
  if ("Date_dépôt" %in% names(Donnees_Existantes)) {
    Donnees_Existantes <- Donnees_Existantes |>
      mutate(Date_dépôt = if (is.numeric(Date_dépôt)) {
        format(as.Date(Date_dépôt, origin = "1899-12-30"), "%Y-%m-%d")
      } else {
        as.character(Date_dépôt)
      })
  }
  
  if ("Date_MAJ" %in% names(Donnees_Existantes)) {
    Donnees_Existantes$Date_MAJ <- as.character(Donnees_Existantes$Date_MAJ)
  }
  if ("Date_MAJ_Langs" %in% names(Donnees_Existantes)) {
    Donnees_Existantes$Date_MAJ_Langs <- as.character(Donnees_Existantes$Date_MAJ_Langs)
  }
  
  if ("Statut_DE" %in% names(Donnees_Existantes) && !"Statut" %in% names(Donnees_Existantes)) {
    cat("  -> Migration de l'ancienne structure de colonnes...\n")
    Donnees_Existantes <- Donnees_Existantes |>
      mutate(
        Statut = paste0(na0(Statut_DE), " / ", na0(Statut_FR)),
        Mention = "À recalculer"
      ) |>
      select(ID, Numéro, Type, Auteur, Date_dépôt, Conseil, Titre_DE, Titre_FR, 
             Statut, Lien_DE, Lien_FR, Mention)
  } else if (!"Mention" %in% names(Donnees_Existantes)) {
    Donnees_Existantes <- Donnees_Existantes |>
      mutate(Mention = "À recalculer")
  }
  
  n_avant <- nrow(Donnees_Existantes)
  Donnees_Existantes <- Donnees_Existantes |>
    filter(!Numéro %in% faux_positifs)
  if (nrow(Donnees_Existantes) < n_avant) {
    cat("  -> Exclusion de", n_avant - nrow(Donnees_Existantes), "faux positifs\n")
  }
  
  IDs_Existants <- Donnees_Existantes$ID
  cat("  ->", nrow(Donnees_Existantes), "interventions existantes\n\n")
} else {
  cat("Pas de fichier existant. Recherche complète...\n\n")
}

# ============================================================================
# DÉTERMINER LES SESSIONS À RECHERCHER
# ============================================================================

cat("Récupération des sessions des législatures", paste(Legislaturen, collapse = " et "), "...\n")

Sessionen <- NULL
for (Legislatur in Legislaturen) {
  cat("  Législature", Legislatur, "...")
  sess_tmp <- get_data(
    table = "Session",
    Language = "DE",
    LegislativePeriodNumber = Legislatur
  ) |>
    select(ID, SessionName, StartDate, EndDate) |>
    mutate(
      StartDate = as.Date(StartDate),
      EndDate = as.Date(EndDate)
    )
  cat(nrow(sess_tmp), "sessions\n")
  Sessionen <- bind_rows(Sessionen, sess_tmp)
}

date_limite <- Sys.Date() - months(MOIS_MISE_A_JOUR)

if (!is.null(Donnees_Existantes)) {
  Sessions_A_Chercher <- Sessionen |>
    filter(EndDate >= date_limite | is.na(EndDate))
  cat("Mode incrémental: sessions depuis", format(date_limite, "%d.%m.%Y"), "\n")
} else {
  Sessions_A_Chercher <- Sessionen
  cat("Mode complet: toutes les sessions\n")
}

SessionID <- Sessions_A_Chercher$ID
cat("Sessions à analyser:", length(SessionID), "\n\n")

# ============================================================================
# RECHERCHE EN ALLEMAND (DE) - INTERVENTIONS PARLEMENTAIRES
# ============================================================================

cat("Recherche des objets liés à la migration/asile en allemand...\n")

Geschaefte_DE <- list()

for (sid in SessionID) {
  cat("  Session", sid, "...")
  
  tmp <- tryCatch({
    get_data(
      table = "Business",
      SubmissionSession = sid,
      Language = "DE"
    ) |>
      filter(BusinessType %in% Geschaeftstyp) |>
      concatener_textes() |>
      filter(str_detect(Text, pattern_migration_de)) |>
      mutate(
        SessionID = sid,
        Langue_Detection = "DE"
      ) |>
      select(SessionID, ID, BusinessShortNumber, Title, BusinessTypeAbbreviation, 
             SubmissionDate, BusinessStatusText, Langue_Detection)
  }, error = function(e) {
    cat(" erreur:", e$message, "\n")
    return(NULL)
  })
  
  if (!is.null(tmp) && nrow(tmp) > 0) {
    Geschaefte_DE[[as.character(sid)]] <- tmp
    cat(" ", nrow(tmp), "objets trouvés\n")
  } else {
    cat(" 0 objets\n")
  }
}

Geschaefte_DE <- bind_rows(Geschaefte_DE)
cat("Total objets trouvés en allemand:", nrow(Geschaefte_DE), "\n\n")

# ============================================================================
# RECHERCHE EN FRANÇAIS (FR) - INTERVENTIONS PARLEMENTAIRES
# ============================================================================

cat("Recherche des objets liés à la migration/asile en français...\n")

Geschaefte_FR <- list()

for (sid in SessionID) {
  cat("  Session", sid, "...")
  
  tmp <- tryCatch({
    get_data(
      table = "Business",
      SubmissionSession = sid,
      Language = "FR"
    ) |>
      filter(BusinessType %in% Geschaeftstyp) |>
      concatener_textes() |>
      filter(str_detect(Text, pattern_migration_fr)) |>
      mutate(
        SessionID = sid,
        Langue_Detection = "FR"
      ) |>
      select(SessionID, ID, BusinessShortNumber, Title, BusinessTypeAbbreviation, 
             SubmissionDate, BusinessStatusText, Langue_Detection)
  }, error = function(e) {
    cat(" erreur:", e$message, "\n")
    return(NULL)
  })
  
  if (!is.null(tmp) && nrow(tmp) > 0) {
    Geschaefte_FR[[as.character(sid)]] <- tmp
    cat(" ", nrow(tmp), "objets trouvés\n")
  } else {
    cat(" 0 objets\n")
  }
}

Geschaefte_FR <- bind_rows(Geschaefte_FR)
cat("Total objets trouvés en français:", nrow(Geschaefte_FR), "\n\n")

# ============================================================================
# RECHERCHE SUPPLÉMENTAIRE: OBJETS DE COMMISSIONS (SANS SESSION)
# Les objets déposés par des commissions ont SubmissionSession = null,
# ils ne sont donc jamais trouvés par la recherche par session.
# On passe par Committee + BusinessRole (par CommitteeNumber) pour les identifier.
# ============================================================================

cat("Recherche supplémentaire: objets de commissions (sans session)...\n")

Geschaefte_Commission_DE <- tibble()
Geschaefte_Commission_FR <- tibble()

# IDs déjà trouvés par la recherche par session (pour éviter les doublons)
IDs_Session_DE <- if (nrow(Geschaefte_DE) > 0) unique(Geschaefte_DE$ID) else c()
IDs_Session_FR <- if (nrow(Geschaefte_FR) > 0) unique(Geschaefte_FR$ID) else c()
IDs_Session_All <- unique(c(IDs_Session_DE, IDs_Session_FR))

tryCatch({
  cat("  Récupération des commissions...")
  Commissions_Table <- get_data(table = "Committee", Language = "FR", silent = TRUE)
  Comm_Nums <- unique(Commissions_Table$CommitteeNumber)
  cat(" ", length(Comm_Nums), "commissions\n")
  
  cat("  Récupération des BusinessRole par CommitteeNumber...")
  Roles_Commissions <- get_data(table = "BusinessRole", CommitteeNumber = Comm_Nums, 
                                 Role = 7, Language = "FR", silent = TRUE)
  cat(" ", nrow(Roles_Commissions), "entrées\n")
  
  if (nrow(Roles_Commissions) > 0) {
    Commission_IDs <- unique(Roles_Commissions$BusinessNumber)
    
    if (!is.null(Donnees_Existantes)) {
      min_id <- as.integer(paste0(format(Sys.Date() - months(MOIS_MISE_A_JOUR), "%Y"), "0000"))
      Commission_IDs <- Commission_IDs[Commission_IDs >= min_id]
      cat("  Mode incrémental: objets depuis ID >=", min_id, "->", length(Commission_IDs), "candidats\n")
    } else {
      cat("  Mode complet:", length(Commission_IDs), "candidats\n")
    }
    
    Commission_IDs <- setdiff(Commission_IDs, IDs_Session_All)
    if (!is.null(Donnees_Existantes)) {
      Commission_IDs <- setdiff(Commission_IDs, IDs_Existants)
    }
    cat("  Après exclusion doublons:", length(Commission_IDs), "objets à vérifier\n")
    
    if (length(Commission_IDs) > 0) {
      cat("  Récupération Business DE...")
      Business_Commission_DE <- get_data(table = "Business", ID = Commission_IDs, Language = "DE", silent = TRUE)
      cat(" ", nrow(Business_Commission_DE), "objets\n")
      
      cat("  Récupération Business FR...")
      Business_Commission_FR <- get_data(table = "Business", ID = Commission_IDs, Language = "FR", silent = TRUE)
      cat(" ", nrow(Business_Commission_FR), "objets\n")
      
      if (nrow(Business_Commission_DE) > 0) {
        Geschaefte_Commission_DE <- Business_Commission_DE |>
          filter(BusinessType %in% Geschaeftstyp) |>
          concatener_textes() |>
          filter(str_detect(Text, pattern_migration_de)) |>
          mutate(SessionID = NA_integer_, Langue_Detection = "DE") |>
          select(SessionID, ID, BusinessShortNumber, Title, BusinessTypeAbbreviation,
                 SubmissionDate, BusinessStatusText, Langue_Detection)
      }
      
      if (nrow(Business_Commission_FR) > 0) {
        Geschaefte_Commission_FR <- Business_Commission_FR |>
          filter(BusinessType %in% Geschaeftstyp) |>
          concatener_textes() |>
          filter(str_detect(Text, pattern_migration_fr)) |>
          mutate(SessionID = NA_integer_, Langue_Detection = "FR") |>
          select(SessionID, ID, BusinessShortNumber, Title, BusinessTypeAbbreviation,
                 SubmissionDate, BusinessStatusText, Langue_Detection)
      }
    }
  }
}, error = function(e) {
  cat(" ERREUR recherche commissions:", e$message, "\n")
})

cat("Total objets de commissions trouvés (DE):", nrow(Geschaefte_Commission_DE), "\n")
cat("Total objets de commissions trouvés (FR):", nrow(Geschaefte_Commission_FR), "\n\n")

# ============================================================================
# FUSION DES RÉSULTATS DE LA RECHERCHE (INTERVENTIONS)
# ============================================================================

cat("Fusion et dédoublonnage des interventions...\n")

Tous_Geschaefte <- bind_rows(Geschaefte_DE, Geschaefte_FR, Geschaefte_Commission_DE, Geschaefte_Commission_FR)

if (nrow(Tous_Geschaefte) == 0 || !"BusinessShortNumber" %in% names(Tous_Geschaefte)) {
  cat("Aucun nouvel objet trouvé dans les sessions analysées.\n")
  Geschaefte_Uniques <- tibble(
    ID = integer(),
    BusinessShortNumber = character(),
    Title = character(),
    BusinessTypeAbbreviation = character(),
    SubmissionDate = as.Date(character()),
    BusinessStatusText = character(),
    Langues_Detection = character()
  )
} else {
  Geschaefte_Uniques <- Tous_Geschaefte |>
    filter(!BusinessShortNumber %in% faux_positifs) |>
    group_by(ID) |>
    summarise(
      BusinessShortNumber = first(BusinessShortNumber),
      Title = first(Title),
      BusinessTypeAbbreviation = first(BusinessTypeAbbreviation),
      SubmissionDate = first(SubmissionDate),
      BusinessStatusText = first(BusinessStatusText),
      Langues_Detection = paste(unique(Langue_Detection), collapse = ", "),
      .groups = "drop"
    )
}

Nouveaux_IDs <- setdiff(Geschaefte_Uniques$ID, IDs_Existants)
IDs_A_Mettre_A_Jour <- intersect(Geschaefte_Uniques$ID, IDs_Existants)

IDs_Recalcul_Interne <- c()

if (!is.null(Donnees_Existantes)) {
  if ("Mention" %in% names(Donnees_Existantes)) {
    IDs_Recalcul_Interne <- c(IDs_Recalcul_Interne, 
      Donnees_Existantes |> filter(Mention == "À recalculer") |> pull(ID))
  }
  
  if ("Auteur" %in% names(Donnees_Existantes)) {
    IDs_Recalcul_Interne <- c(IDs_Recalcul_Interne,
      Donnees_Existantes |> filter(is.na(Auteur) | Auteur == "") |> pull(ID))
  }
  
  if ("Département" %in% names(Donnees_Existantes)) {
    IDs_Sans_Dept <- Donnees_Existantes |> filter(is.na(Département) | Département == "") |> pull(ID)
    IDs_Recalcul_Interne <- c(IDs_Recalcul_Interne, IDs_Sans_Dept)
    cat("Objets sans département:", length(IDs_Sans_Dept), "\n")
  }
  
  if ("Domaines_FR" %in% names(Donnees_Existantes)) {
    IDs_Sans_Tags <- Donnees_Existantes |> filter(is.na(Domaines_FR) | Domaines_FR == "") |> pull(ID)
    IDs_Recalcul_Interne <- c(IDs_Recalcul_Interne, IDs_Sans_Tags)
    cat("Objets sans tags:", length(IDs_Sans_Tags), "\n")
  } else {
    IDs_Sans_Tags <- Donnees_Existantes |> pull(ID)
    IDs_Recalcul_Interne <- c(IDs_Recalcul_Interne, IDs_Sans_Tags)
    cat("Colonne Domaines_FR absente - récupération tags pour tous:", length(IDs_Sans_Tags), "\n")
  }
  
  IDs_Recalcul_Interne <- unique(IDs_Recalcul_Interne)
  IDs_A_Mettre_A_Jour <- unique(c(IDs_A_Mettre_A_Jour, IDs_Recalcul_Interne))
  cat("Objets à recalculer (Mention/Auteur/Dept):", length(IDs_Recalcul_Interne), "\n")
}

cat("Nouveaux objets:", length(Nouveaux_IDs), "\n")
cat("Objets à mettre à jour:", length(IDs_A_Mettre_A_Jour), "\n\n")

# ============================================================================
# RÉCUPÉRATION DES DÉTAILS COMPLETS (nouveaux + màj)
# ============================================================================

IDs_A_Traiter <- c(Nouveaux_IDs, IDs_A_Mettre_A_Jour)

if (length(IDs_A_Traiter) > 0) {
  
  cat("Récupération des détails pour", length(IDs_A_Traiter), "objets...\n")
  
  Daten_DE <- get_data(table = "Business", ID = IDs_A_Traiter, Language = "DE") |>
    select(ID, BusinessShortNumber, BusinessTypeAbbreviation, Title, 
           SubmittedBy, BusinessStatusText, SubmissionDate, SubmissionCouncilAbbreviation,
           ResponsibleDepartmentAbbreviation, ResponsibleDepartmentName,
           SubmittedText, ReasonText, FederalCouncilResponseText, TagNames)
  
  Daten_FR <- get_data(table = "Business", ID = IDs_A_Traiter, Language = "FR") |>
    select(ID, Title, BusinessStatusText, SubmittedText, ReasonText, FederalCouncilResponseText, TagNames)
  
  names(Daten_FR) <- c("ID", "Titre_FR", "Statut_FR", "SubmittedText_FR", "ReasonText_FR", "FederalCouncilResponseText_FR", "TagNames_FR")
  
  # Récupérer les titres et tags italiens
  Daten_IT <- tryCatch({
    get_data(table = "Business", ID = IDs_A_Traiter, Language = "IT") |>
      select(ID, Title, TagNames) |>
      rename(Titre_IT = Title, TagNames_IT = TagNames)
  }, error = function(e) {
    cat("  Erreur récupération titres IT:", e$message, "\n")
    data.frame(ID = IDs_A_Traiter, Titre_IT = NA_character_, TagNames_IT = NA_character_)
  })
  
  cat("Récupération des partis des auteurs...\n")
  
  Auteurs <- tryCatch({
    get_data(table = "BusinessRole", BusinessNumber = IDs_A_Traiter, Role = 7, Language = "FR") |>
      filter(!is.na(MemberCouncilNumber)) |>
      select(BusinessNumber, MemberCouncilNumber) |>
      distinct()
  }, error = function(e) {
    cat("  Erreur récupération auteurs:", e$message, "\n")
    NULL
  })
  
  if (!is.null(Auteurs) && nrow(Auteurs) > 0) {
    MemberCouncilIds <- unique(Auteurs$MemberCouncilNumber)
    cat("  ->", length(MemberCouncilIds), "auteurs trouvés\n")
    
    Partis <- tryCatch({
      get_data(table = "MemberCouncil", ID = MemberCouncilIds, Language = "FR") |>
        select(ID, PartyAbbreviation) |>
        rename(MemberCouncilNumber = ID, Parti = PartyAbbreviation)
    }, error = function(e) {
      cat("  Erreur récupération partis:", e$message, "\n")
      NULL
    })
    
    if (!is.null(Partis)) {
      Partis <- Partis |>
        mutate(Parti = sapply(Parti, normaliser_parti))
      
      Auteurs <- Auteurs |>
        left_join(Partis, by = "MemberCouncilNumber") |>
        select(BusinessNumber, Parti) |>
        rename(ID = BusinessNumber)
      
      Daten_DE <- Daten_DE |>
        left_join(Auteurs, by = "ID")
    } else {
      Daten_DE <- Daten_DE |> mutate(Parti = NA_character_)
    }
  } else {
    Daten_DE <- Daten_DE |> mutate(Parti = NA_character_)
  }
  
  IDs_Sans_Auteur <- Daten_DE |> filter(is.na(SubmittedBy)) |> pull(ID)
  
  if (length(IDs_Sans_Auteur) > 0) {
    cat("Récupération des commissions pour", length(IDs_Sans_Auteur), "objets sans auteur...\n")
    
    Roles_Commission <- tryCatch({
      get_data(table = "BusinessRole", BusinessNumber = IDs_Sans_Auteur, Language = "FR") |>
        filter(!is.na(CommitteeNumber)) |>
        select(BusinessNumber, CommitteeNumber) |>
        distinct()
    }, error = function(e) NULL)
    
    if (!is.null(Roles_Commission) && nrow(Roles_Commission) > 0) {
      Commissions <- tryCatch({
        get_data(table = "Committee", CommitteeNumber = unique(Roles_Commission$CommitteeNumber), Language = "FR") |>
          select(CommitteeNumber, Abbreviation1) |>
          filter(!is.na(Abbreviation1)) |>
          distinct()
      }, error = function(e) NULL)
      
      if (!is.null(Commissions)) {
        Roles_Commission <- Roles_Commission |>
          left_join(Commissions, by = "CommitteeNumber") |>
          rename(ID = BusinessNumber, Auteur_Commission = Abbreviation1)
        
        Daten_DE <- Daten_DE |>
          left_join(Roles_Commission |> select(ID, Auteur_Commission), by = "ID") |>
          mutate(
            SubmittedBy = if_else(is.na(SubmittedBy) & !is.na(Auteur_Commission), 
                                  Auteur_Commission, SubmittedBy),
            Parti = if_else(is.na(SubmittedBy) | (!is.na(Auteur_Commission)), 
                           "Commissions", Parti)
          ) |>
          select(-Auteur_Commission)
      }
    }
  }
  
  Nouveaux_Resultats <- Daten_DE |>
    left_join(Daten_FR, by = "ID") |>
    left_join(Daten_IT, by = "ID") |>
    left_join(
      Geschaefte_Uniques |> select(ID, Langues_Detection),
      by = "ID"
    ) |>
    mutate(
      Texte_Question = paste(
        na0(SubmittedText), na0(ReasonText),
        na0(SubmittedText_FR), na0(ReasonText_FR),
        sep = " "
      ) |> strip_html(),
      Texte_Reponse = paste(
        na0(FederalCouncilResponseText),
        na0(FederalCouncilResponseText_FR),
        sep = " "
      ) |> strip_html(),
      Mention_Elu = str_detect(Texte_Question, pattern_migration_de) | str_detect(Texte_Question, pattern_migration_fr) | str_detect(Texte_Question, pattern_migration_it),
      Mention_CF = str_detect(Texte_Reponse, pattern_migration_de) | str_detect(Texte_Reponse, pattern_migration_fr) | str_detect(Texte_Reponse, pattern_migration_it),
      Mention = case_when(
        Mention_Elu & Mention_CF ~ "Élu & Conseil fédéral",
        Mention_Elu ~ "Élu",
        Mention_CF ~ "Conseil fédéral",
        TRUE ~ "Titre uniquement"
      ),
      Statut = paste0(BusinessStatusText, " / ", Statut_FR),
      Lien_DE = paste0("https://www.parlament.ch/de/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=", ID),
      Lien_FR = paste0("https://www.parlament.ch/fr/ratsbetrieb/suche-curia-vista/geschaeft?AffairId=", ID)
    ) |>
    select(
      ID,
      Numéro = BusinessShortNumber,
      Type = BusinessTypeAbbreviation,
      Auteur = SubmittedBy,
      Parti,
      Date_dépôt = SubmissionDate,
      Conseil = SubmissionCouncilAbbreviation,
      Département = ResponsibleDepartmentAbbreviation,
      Titre_DE = Title,
      Titre_FR,
      Titre_IT,
      Texte_FR = SubmittedText_FR,
      Texte_DE = SubmittedText,
      Statut,
      Lien_DE,
      Lien_FR,
      Mention,
      Domaines_DE = TagNames,
      Domaines_FR = TagNames_FR,
      Domaines_IT = TagNames_IT
    )
  
  Nouveaux_Resultats <- Nouveaux_Resultats |>
    mutate(
      Date_dépôt = as.character(Date_dépôt),
      Date_MAJ = if_else(ID %in% Nouveaux_IDs, as.character(Sys.Date()), NA_character_),
      Date_MAJ_Langs = NA_character_,
      Type = ifelse(Type == "A", "Fra.", Type)
    )
  
  # ============================================================================
  # FUSIONNER AVEC LES DONNÉES EXISTANTES
  # ============================================================================
  
  if (!is.null(Donnees_Existantes)) {
    Donnees_Existantes <- Donnees_Existantes |>
      mutate(Date_dépôt = as.character(Date_dépôt))
    
    if (!"Parti" %in% names(Donnees_Existantes)) {
      Donnees_Existantes <- Donnees_Existantes |>
        mutate(Parti = NA_character_)
    }
    
    if (!"Date_MAJ" %in% names(Donnees_Existantes)) {
      Donnees_Existantes <- Donnees_Existantes |>
        mutate(Date_MAJ = NA_character_)
    }
    
    if (!"Département" %in% names(Donnees_Existantes)) {
      Donnees_Existantes <- Donnees_Existantes |>
        mutate(Département = NA_character_)
    }
    
    if (!"Domaines_FR" %in% names(Donnees_Existantes)) {
      Donnees_Existantes <- Donnees_Existantes |>
        mutate(Domaines_FR = NA_character_, Domaines_DE = NA_character_, Domaines_IT = NA_character_)
    }
    
    if (!"Date_MAJ_Langs" %in% names(Donnees_Existantes)) {
      Donnees_Existantes <- Donnees_Existantes |>
        mutate(Date_MAJ_Langs = NA_character_)
    }
    
    # Préserver les Date_MAJ existantes pour les objets mis à jour (pas nouveaux)
    Date_MAJ_Existantes <- Donnees_Existantes |>
      select(ID, Date_MAJ_Existante = Date_MAJ, Date_MAJ_Langs_Existante = Date_MAJ_Langs) |>
      filter(ID %in% IDs_A_Mettre_A_Jour)
    
    Nouveaux_Resultats <- Nouveaux_Resultats |>
      left_join(Date_MAJ_Existantes, by = "ID") |>
      mutate(
        Date_MAJ = if_else(!is.na(Date_MAJ_Existante), as.character(Date_MAJ_Existante), as.character(Date_MAJ)),
        Date_MAJ_Langs = if_else(!is.na(Date_MAJ_Langs_Existante), as.character(Date_MAJ_Langs_Existante), as.character(Date_MAJ_Langs))
      ) |>
      select(-Date_MAJ_Existante, -Date_MAJ_Langs_Existante)
    
    Donnees_Existantes_Filtrees <- Donnees_Existantes |>
      filter(!ID %in% IDs_A_Mettre_A_Jour)
    
    Resultats <- bind_rows(Donnees_Existantes_Filtrees, Nouveaux_Resultats) |>
      arrange(desc(Date_MAJ), desc(Date_dépôt))
    
    cat("Fusion avec données existantes...\n")
    cat("  - Conservés:", nrow(Donnees_Existantes_Filtrees), "\n")
    cat("  - Ajoutés/Mis à jour:", nrow(Nouveaux_Resultats), "\n")
  } else {
    Resultats <- Nouveaux_Resultats |>
      arrange(desc(Date_MAJ), desc(Date_dépôt))
  }
  
} else {
  cat("Aucun nouvel objet ou mise à jour.\n")
  Resultats <- Donnees_Existantes
}

# Appliquer les corrections de partis spéciaux
if (!is.null(Resultats) && nrow(Resultats) > 0) {
  Resultats <- corriger_partis_speciaux(Resultats)
}

# ============================================================================
# EXPORT NOUVEAUTÉS
# ============================================================================

Changements_Pertinents <- NULL

if (length(Nouveaux_IDs) > 0 || length(IDs_A_Mettre_A_Jour) > 0) {
  cat("\nAnalyse des changements pertinents...\n")
  
  if (length(Nouveaux_IDs) > 0) {
    Nouveaux <- Nouveaux_Resultats |>
      filter(ID %in% Nouveaux_IDs) |>
      mutate(Type_Changement = "Nouvel objet")
    Changements_Pertinents <- bind_rows(Changements_Pertinents, Nouveaux)
    cat("  - Nouveaux objets:", length(Nouveaux_IDs), "\n")
  }
  
  IDs_MAJ_Reels <- setdiff(IDs_A_Mettre_A_Jour, IDs_Recalcul_Interne)
  IDs_Statut_Change <- c()
  IDs_Reponse_CF <- c()
  date_maj_langs_map <- list()
  
  if (length(IDs_MAJ_Reels) > 0 && !is.null(Donnees_Existantes)) {
    nb_reponse_cf <- 0
    
    for (id in IDs_MAJ_Reels) {
      ancien <- Donnees_Existantes |> filter(ID == id)
      nouveau <- Nouveaux_Resultats |> filter(ID == id)
      
      if (nrow(ancien) > 0 && nrow(nouveau) > 0) {
        if (!identical(ancien$Statut[1], nouveau$Statut[1])) {
          IDs_Statut_Change <- c(IDs_Statut_Change, id)
        }
        
        ancien_mention <- ancien$Mention[1]
        nouveau_mention <- nouveau$Mention[1]
        
        avant_sans_cf <- ancien_mention %in% c("Élu", "Titre uniquement")
        maintenant_avec_cf <- str_detect(nouveau_mention, "Conseil fédéral")
        
        if (avant_sans_cf && maintenant_avec_cf) {
          MAJ <- nouveau |>
            mutate(Type_Changement = "Réponse CF ajoutée")
          Changements_Pertinents <- bind_rows(Changements_Pertinents, MAJ)
          nb_reponse_cf <- nb_reponse_cf + 1
          IDs_Reponse_CF <- c(IDs_Reponse_CF, id)
        } else if (id %in% IDs_Statut_Change) {
          langs_updated <- c()
          
          old_parts <- strsplit(as.character(ancien$Statut[1]), " / ", fixed = TRUE)[[1]]
          new_parts <- strsplit(as.character(nouveau$Statut[1]), " / ", fixed = TRUE)[[1]]
          de_changed <- !identical(trimws(old_parts[1]), trimws(new_parts[1]))
          fr_changed <- !identical(
            if (length(old_parts) > 1) trimws(old_parts[2]) else "",
            if (length(new_parts) > 1) trimws(new_parts[2]) else ""
          )
          
          if ("Titre_FR" %in% names(ancien)) {
            if (est_titre_manquant(ancien$Titre_FR[1]) && !est_titre_manquant(nouveau$Titre_FR[1])) {
              fr_changed <- TRUE
            }
          }
          if ("Titre_DE" %in% names(ancien)) {
            if (est_titre_manquant(ancien$Titre_DE[1]) && !est_titre_manquant(nouveau$Titre_DE[1])) {
              de_changed <- TRUE
            }
          }
          it_changed <- FALSE
          if ("Titre_IT" %in% names(ancien) && "Titre_IT" %in% names(nouveau)) {
            if (est_titre_manquant(ancien$Titre_IT[1]) && !est_titre_manquant(nouveau$Titre_IT[1])) {
              it_changed <- TRUE
            }
          }
          
          if (de_changed) langs_updated <- c(langs_updated, "de")
          if (fr_changed) langs_updated <- c(langs_updated, "fr")
          if (it_changed || de_changed) langs_updated <- unique(c(langs_updated, "it"))
          
          if (length(langs_updated) > 0 && length(langs_updated) < 3) {
            date_maj_langs_map[[as.character(id)]] <- paste(langs_updated, collapse = ",")
            cat("    ID", id, "-> MAJ langues:", paste(langs_updated, collapse = ", "), "\n")
          }
        }
      }
    }
    cat("  - Réponses CF ajoutées:", nb_reponse_cf, "\n")
    cat("  - Statuts modifiés (pour page web):", length(IDs_Statut_Change), "\n")
    
    if (length(IDs_Statut_Change) > 0) {
      date_maj_langs_vec <- sapply(as.character(Resultats$ID), function(rid) {
        if (rid %in% names(date_maj_langs_map)) date_maj_langs_map[[rid]] else NA_character_
      })
      
      Resultats <- Resultats |>
        mutate(
          Statut_Change_Date = if_else(ID %in% IDs_Statut_Change, as.character(Sys.Date()), NA_character_),
          Date_MAJ = if_else(ID %in% IDs_Statut_Change, as.character(Sys.Date()), Date_MAJ),
          Date_MAJ_Langs = if_else(ID %in% IDs_Statut_Change, date_maj_langs_vec[as.character(ID)], Date_MAJ_Langs)
        )
    }
  }
  
  cat("  - Recalculs internes (ignorés):", length(IDs_Recalcul_Interne), "\n")
}

if (!is.null(Changements_Pertinents) && nrow(Changements_Pertinents) > 0) {
  dossier_nouveautes <- file.path(script_dir, "Nouveautés")
  if (!dir.exists(dossier_nouveautes)) {
    dir.create(dossier_nouveautes)
  }
  
  Export_Nouveautes <- Changements_Pertinents |>
    select(Type_Changement, Numéro, Auteur, Mention, Statut, Lien_FR)
  
  nom_fichier <- paste0("Nouveautes_", format(Sys.Date(), "%Y-%m-%d"), ".xlsx")
  chemin_fichier <- file.path(dossier_nouveautes, nom_fichier)
  
  write.xlsx(
    Export_Nouveautes,
    file = chemin_fichier,
    overwrite = TRUE,
    asTable = TRUE,
    sheetName = "Nouveautés"
  )
  
  cat("\nExport nouveautés ->", chemin_fichier, "\n")
  cat("  Total changements pertinents:", nrow(Export_Nouveautes), "\n")
} else {
  cat("\nAucun changement pertinent à exporter.\n")
}

# ============================================================================
# EXPORT EXCEL
# ============================================================================

if (!is.null(Resultats) && nrow(Resultats) > 0) {
  
  cat("\nExport vers", FICHIER_EXCEL, "...\n")
  
  wb <- createWorkbook()
  addWorksheet(wb, "SEM-Migration")
  writeDataTable(wb, "SEM-Migration", Resultats)
  
  saveWorkbook(wb, file = FICHIER_EXCEL, overwrite = TRUE)
  
  # ============================================================================
  # GÉNÉRATION DU RÉSUMÉ DE SESSION
  # ============================================================================
  
  cat("Génération du résumé de session...\n")
  
  sessions_file <- file.path(script_dir, "sessions.json")
  sessions_data <- jsonlite::fromJSON(sessions_file)$sessions
  sessions_data$start <- as.Date(sessions_data$start)
  sessions_data$end <- as.Date(sessions_data$end)
  
  aujourd_hui <- Sys.Date()
  sessions_terminees <- sessions_data |>
    filter(end < aujourd_hui) |>
    arrange(desc(end))
  
  prochaine_session <- sessions_data |>
    filter(start > aujourd_hui) |>
    arrange(start) |>
    slice(1)
  
  session_summary <- NULL
  
  if (nrow(sessions_terminees) > 0) {
    derniere_session <- sessions_terminees[1, ]
    
    interventions_session <- Resultats |>
      filter(
        as.Date(Date_dépôt) >= derniere_session$start,
        as.Date(Date_dépôt) <= derniere_session$end
      )
    
    if (nrow(interventions_session) > 0) {
      cat("  ->", nrow(interventions_session), "interventions pour", derniere_session$name_fr, "\n")
      
      par_type <- interventions_session |>
        group_by(Type) |>
        summarise(n = n(), .groups = "drop") |>
        arrange(desc(n))
      
      par_conseil <- interventions_session |>
        group_by(Conseil) |>
        summarise(n = n(), .groups = "drop")
      
      par_parti <- interventions_session |>
        filter(!is.na(Parti)) |>
        group_by(Parti) |>
        summarise(n = n(), .groups = "drop") |>
        arrange(desc(n))
      
      types_text_fr <- paste(
        sapply(1:nrow(par_type), function(i) {
          type_name <- switch(par_type$Type[i],
            "Mo." = "motion",
            "Po." = "postulat",
            "Ip." = "interpellation",
            "Fra." = "question",
            "A" = "initiative",
            par_type$Type[i]
          )
          if (par_type$n[i] > 1) type_name <- paste0(type_name, "s")
          paste0(par_type$n[i], " ", type_name)
        }),
        collapse = ", "
      )
      
      cn_count <- sum(par_conseil$n[par_conseil$Conseil == "NR"], na.rm = TRUE)
      ce_count <- sum(par_conseil$n[par_conseil$Conseil == "SR"], na.rm = TRUE)
      
      partis_top <- if (nrow(par_parti) > 0) {
        paste(head(par_parti$Parti, 3), collapse = ", ")
      } else ""
      
      partis_top_de <- if (nrow(par_parti) > 0) {
        partis_de <- sapply(head(par_parti$Parti, 3), function(p) {
          switch(p,
            "VERT-E-S" = "GRÜNE",
            "pvl" = "GLP",
            "PS" = "SP",
            "PLR" = "FDP",
            "UDC" = "SVP",
            "Le Centre" = "Die Mitte",
            p
          )
        })
        paste(partis_de, collapse = ", ")
      } else ""
      
      themes_fr <- ""
      themes_de <- ""
      if (nrow(interventions_session) > 0) {
        themes_list_fr <- sapply(seq_len(nrow(interventions_session)), function(i) {
          titre <- interventions_session$Titre_FR[i]
          auteur <- interventions_session$Auteur[i]
          parti <- if ("Parti" %in% names(interventions_session)) interventions_session$Parti[i] else ""
          
          nom_parts <- strsplit(auteur, " ")[[1]]
          nom_famille <- nom_parts[1]
          
          if (!is.na(parti) && parti != "") {
            paste0(titre, " (", nom_famille, ", ", parti, ")")
          } else {
            paste0(titre, " (", nom_famille, ")")
          }
        })
        
        themes_list_de <- sapply(seq_len(nrow(interventions_session)), function(i) {
          titre <- interventions_session$Titre_DE[i]
          auteur <- interventions_session$Auteur[i]
          parti <- if ("Parti" %in% names(interventions_session)) interventions_session$Parti[i] else ""
          
          parti_de <- switch(parti,
            "VERT-E-S" = "GRÜNE",
            "pvl" = "GLP",
            "PS" = "SP",
            "PLR" = "FDP",
            "UDC" = "SVP",
            "Le Centre" = "Die Mitte",
            parti
          )
          
          nom_parts <- strsplit(auteur, " ")[[1]]
          nom_famille <- nom_parts[1]
          
          if (!is.na(parti_de) && parti_de != "") {
            paste0(titre, " (", nom_famille, ", ", parti_de, ")")
          } else {
            paste0(titre, " (", nom_famille, ")")
          }
        })
        
        themes_fr <- paste(themes_list_fr, collapse = " ; ")
        themes_de <- paste(themes_list_de, collapse = " ; ")
      }
      
      resume_fr <- paste0(
        "Durant la ", derniere_session$name_fr, " (",
        format(derniere_session$start, "%d.%m"), " - ",
        format(derniere_session$end, "%d.%m.%Y"), "), ",
        nrow(interventions_session), " interventions liées à la migration et à l'asile ont été déposées : ",
        types_text_fr, ". ",
        if (cn_count > 0 && ce_count > 0) {
          paste0(cn_count, " au Conseil national et ", ce_count, " au Conseil des États. ")
        } else if (cn_count > 0) {
          paste0("Toutes au Conseil national. ")
        } else {
          paste0("Toutes au Conseil des États. ")
        },
        if (nrow(par_parti) > 0) {
          paste0("Les partis les plus actifs : ", partis_top, ".")
        } else ""
      )
      
      types_text_de <- paste(
        sapply(1:nrow(par_type), function(i) {
          type_name <- switch(par_type$Type[i],
            "Mo." = "Motion",
            "Po." = "Postulat",
            "Ip." = "Interpellation",
            "Fra." = "Anfrage",
            "A" = "Initiative",
            par_type$Type[i]
          )
          if (par_type$n[i] > 1 && !type_name %in% c("Anfrage")) type_name <- paste0(type_name, "en")
          if (par_type$n[i] > 1 && type_name == "Anfrage") type_name <- "Anfragen"
          paste0(par_type$n[i], " ", type_name)
        }),
        collapse = ", "
      )
      
      resume_de <- paste0(
        "Während der ", derniere_session$name_de, " (",
        format(derniere_session$start, "%d.%m"), " - ",
        format(derniere_session$end, "%d.%m.%Y"), ") wurden ",
        nrow(interventions_session), " Vorstösse zum Thema Migration und Asyl eingereicht: ",
        types_text_de, ". ",
        if (cn_count > 0 && ce_count > 0) {
          paste0(cn_count, " im Nationalrat und ", ce_count, " im Ständerat. ")
        } else if (cn_count > 0) {
          paste0("Alle im Nationalrat. ")
        } else {
          paste0("Alle im Ständerat. ")
        },
        if (nrow(par_parti) > 0) {
          paste0("Die aktivsten Parteien: ", partis_top_de, ".")
        } else ""
      )
      
      session_summary <- list(
        session_id = derniere_session$id,
        title_fr = paste0("Résumé de la ", sub("Session ", "session ", derniere_session$name_fr)),
        title_de = paste0("Zusammenfassung der ", derniere_session$name_de),
        text_fr = resume_fr,
        text_de = resume_de,
        themes_fr = themes_fr,
        themes_de = themes_de,
        session_start = as.character(derniere_session$start),
        session_end = as.character(derniere_session$end),
        display_until = if (nrow(prochaine_session) > 0) as.character(prochaine_session$start[1]) else NA_character_,
        count = nrow(interventions_session),
        by_type = setNames(as.list(par_type$n), par_type$Type),
        by_council = list(
          CN = cn_count,
          CE = ce_count
        ),
        interventions = interventions_session |>
          mutate(
            shortId = Numéro,
            title = Titre_FR,
            title_de = Titre_DE,
            title_it = if ("Titre_IT" %in% names(interventions_session)) Titre_IT else NA_character_,
            author = Auteur,
            party = if ("Parti" %in% names(interventions_session)) Parti else NA_character_,
            type = Type,
            url_fr = Lien_FR,
            url_de = Lien_DE
          ) |>
          select(shortId, title, title_de, title_it, author, party, type, url_fr, url_de) |>
          as.list()
      )
      
      cat("  -> Résumé généré pour", derniere_session$name_fr, "\n")
    } else {
      cat("  -> Aucune intervention pour la dernière session\n")
    }
  } else {
    cat("  -> Aucune session terminée trouvée\n")
  }
  
  # ============================================================================
  # EXPORT JSON POUR GITHUB
  # ============================================================================
  
  cat("Export JSON pour GitHub...\n")
  
  Donnees_JSON <- Resultats |>
    mutate(
      shortId = Numéro,
      title = Titre_FR,
      title_de = Titre_DE,
      title_it = if ("Titre_IT" %in% names(Resultats)) Titre_IT else NA_character_,
      author = Auteur,
      party = if ("Parti" %in% names(Resultats)) Parti else NA_character_,
      type = ifelse(Type == "A", "Fra.", Type),
      status = Statut,
      council = Conseil,
      department = if ("Département" %in% names(Resultats)) Département else NA_character_,
      date = as.character(Date_dépôt),
      date_maj = if ("Date_MAJ" %in% names(Resultats)) Date_MAJ else NA_character_,
      statut_change_date = if ("Statut_Change_Date" %in% names(Resultats)) Statut_Change_Date else NA_character_,
      url_fr = Lien_FR,
      url_de = Lien_DE,
      mention = Mention,
      text = if ("Texte_FR" %in% names(Resultats)) Texte_FR else NA_character_,
      text_de = if ("Texte_DE" %in% names(Resultats)) Texte_DE else NA_character_,
      tags = if ("Domaines_FR" %in% names(Resultats)) Domaines_FR else NA_character_,
      tags_de = if ("Domaines_DE" %in% names(Resultats)) Domaines_DE else NA_character_,
      tags_it = if ("Domaines_IT" %in% names(Resultats)) Domaines_IT else NA_character_,
      date_maj_langs = if ("Date_MAJ_Langs" %in% names(Resultats)) Date_MAJ_Langs else NA_character_
    ) |>
    select(shortId, title, title_de, title_it, author, party, type, status, 
           council, department, date, date_maj, date_maj_langs, statut_change_date, url_fr, url_de, mention, text, text_de, tags, tags_de, tags_it) |>
    mutate(party = case_when(
      party == "-" ~ "UDC",
      party == "csp-ow" ~ "Le Centre",
      party == "PLD" ~ "LDP",
      party == "PEV" ~ "EVP",
      party == "UDF" ~ "EDU",
      TRUE ~ party
    ))
  
  # Charger le suivi existant des new_ids
  new_ids_tracking <- if (file.exists(FICHIER_NEW_IDS)) {
    jsonlite::fromJSON(FICHIER_NEW_IDS)
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
  
  if (length(Nouveaux_IDs) > 0) {
    nouveaux_short_ids <- Resultats |> filter(ID %in% Nouveaux_IDs) |> pull(Numéro)
    for (nid in nouveaux_short_ids) {
      if (!nid %in% new_ids_df$id) {
        new_ids_df <- bind_rows(new_ids_df, tibble(id = nid, date_added = Sys.Date()))
      }
    }
  }
  
  new_ids_list <- setNames(as.list(as.character(new_ids_df$date_added)), new_ids_df$id)
  jsonlite::write_json(new_ids_list, FICHIER_NEW_IDS, auto_unbox = TRUE, pretty = TRUE)
  cat("  -> Nouveautés actives:", nrow(new_ids_df), "(", JOURS_NOUVEAUTE, "jours)\n")
  
  vrais_nouveaux_ids <- new_ids_df$id
  
  json_export <- list(
    meta = list(
      updated = format(Sys.time(), "%Y-%m-%dT%H:%M:%S"),
      total_count = nrow(Resultats),
      source = "Swiss Parliament API",
      legislature = Legislatur,
      new_ids = vrais_nouveaux_ids
    ),
    session_summary = session_summary,
    items = Donnees_JSON
  )
  
  json_content <- jsonlite::toJSON(json_export, pretty = TRUE, auto_unbox = TRUE)
  writeLines(json_content, FICHIER_JSON)
  cat("  ->", FICHIER_JSON, "\n")
  
  # ============================================================================
  # RÉSUMÉ
  # ============================================================================
  
  cat("\n============================================\n")
  cat("RÉSUMÉ\n")
  cat("============================================\n")
  cat("Mode:", ifelse(is.null(Donnees_Existantes), "Recherche complète", "Mise à jour incrémentale"), "\n")
  cat("Législature:", Legislatur, "\n")
  cat("Sessions analysées:", length(SessionID), "\n")
  cat("Total interventions:", nrow(Resultats), "\n")
  cat("Nouveaux:", length(Nouveaux_IDs), "\n")
  cat("Mis à jour:", length(IDs_A_Mettre_A_Jour), "\n")
  cat("\nRépartition par type:\n")
  print(table(Resultats$Type))
  cat("\nFichiers exportés:\n")
  cat(" -", FICHIER_EXCEL, "\n")
  cat(" -", FICHIER_JSON, "(pour GitHub)\n")
  cat("\n⚠️  N'oubliez pas de commit/push les fichiers sur GitHub!\n")
  
} else {
  cat("Aucun résultat à exporter.\n")
}
