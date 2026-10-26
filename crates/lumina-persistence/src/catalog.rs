use crate::{SqliteStorage, StorageError};
use lumina_app::{
  ApplicationFailure, BookInformation, CatalogFailureData, EditionId, ImportResult, ImportReview,
  LibraryStorage, NavigationDirection, OperationError, ReferenceInputRequest, ReferenceInputResult,
  ResolvedVerse, SearchRequest, SearchResult, Storage, Translation, TranslationData, TranslationId,
  VerseCoordinate,
};
use rusqlite::{params, OptionalExtension};

impl LibraryStorage for SqliteStorage {
  fn library_revision(&self) -> Result<u32, Self::Error> {
    self
      .connection
      .query_row("SELECT revision FROM catalog_meta WHERE singleton=1", [], |row| row.get(0))
      .map_err(StorageError::Catalog)
  }
  fn list_translations(&self) -> Result<Vec<Translation>, Self::Error> {
    let transaction = self.connection.unchecked_transaction().map_err(StorageError::Catalog)?;
    Ok(crate::library::read_state(&transaction).map_err(StorageError::Catalog)?.translations)
  }
  fn books(&self, translation_id: &TranslationId) -> Result<Vec<BookInformation>, Self::Error> {
    self.connection.prepare("SELECT t.edition_id,t.title,b.book_number,b.name,b.author,b.writing_date,b.writing_location,b.metadata_attribution,b.metadata_source_url,b.metadata_rights_notice FROM books b JOIN translations t ON t.id=b.translation_id WHERE t.id=?1 ORDER BY b.book_number").map_err(StorageError::Catalog)?.query_map([&translation_id.0],|row|Ok(BookInformation {translation_id:translation_id.clone(),edition_id:EditionId(row.get(0)?),translation_title:row.get(1)?,book_number:row.get(2)?,name:row.get(3)?,author:row.get(4)?,writing_date:row.get(5)?,writing_location:row.get(6)?,metadata_attribution:row.get(7)?,metadata_source_url:row.get(8)?,metadata_rights_notice:row.get(9)?})).map_err(StorageError::Catalog)?.collect::<rusqlite::Result<Vec<_>>>().map_err(StorageError::Catalog)
  }
  fn chapter_verses(
    &self,
    translation_id: &TranslationId,
    book_number: i32,
    chapter: i32,
  ) -> Result<Vec<ResolvedVerse>, Self::Error> {
    let coordinates=self.connection.prepare("SELECT v.verse FROM verses v JOIN books b ON b.id=v.book_id WHERE v.translation_id=?1 AND b.book_number=?2 AND v.chapter=?3 ORDER BY v.verse").map_err(StorageError::Catalog)?.query_map(params![translation_id.0,book_number,chapter],|row|row.get::<_,i32>(0)).map_err(StorageError::Catalog)?.collect::<rusqlite::Result<Vec<_>>>().map_err(StorageError::Catalog)?;
    coordinates
      .into_iter()
      .map(|verse| {
        self.resolve_reference(
          translation_id,
          VerseCoordinate {
            book_number,
            chapter,
            verse,
          },
        )
      })
      .filter_map(Result::transpose)
      .collect()
  }
  fn adjacent_verse(
    &self,
    translation_id: &TranslationId,
    coordinate: VerseCoordinate,
    direction: NavigationDirection,
  ) -> Result<Option<ResolvedVerse>, Self::Error> {
    let comparison = if direction == NavigationDirection::Next {
      ">"
    } else {
      "<"
    };
    let order = if direction == NavigationDirection::Next {
      "ASC"
    } else {
      "DESC"
    };
    let sql=format!("SELECT b.book_number,v.chapter,v.verse FROM verses v JOIN books b ON b.id=v.book_id WHERE v.translation_id=?1 AND (b.book_number,v.chapter,v.verse) {comparison} (?2,?3,?4) ORDER BY b.book_number {order},v.chapter {order},v.verse {order} LIMIT 1");
    let adjacent = self
      .connection
      .query_row(
        &sql,
        params![translation_id.0, coordinate.book_number, coordinate.chapter, coordinate.verse],
        |row| {
          Ok(VerseCoordinate {
            book_number: row.get(0)?,
            chapter: row.get(1)?,
            verse: row.get(2)?,
          })
        },
      )
      .optional()
      .map_err(StorageError::Catalog)?;
    adjacent
      .map(|coordinate| self.resolve_reference(translation_id, coordinate))
      .transpose()
      .map(Option::flatten)
  }
  fn search_verses(
    &self,
    request: &SearchRequest,
  ) -> Result<SearchResult, OperationError<Self::Error>> {
    crate::search::search(self, request)
  }
  fn resolve_input(
    &self,
    request: &ReferenceInputRequest,
    translation_id: &TranslationId,
  ) -> Result<ReferenceInputResult, OperationError<Self::Error>> {
    crate::references::resolve(self, request, translation_id)
  }
  fn register_import(
    &mut self,
    staged: lumina_app::StagedImport,
  ) -> Result<ImportReview, OperationError<Self::Error>> {
    crate::imports::register(self, staged)
  }
  fn review_import(&mut self, path: &str) -> Result<ImportReview, OperationError<Self::Error>> {
    crate::imports::review(self, path)
  }
  fn commit_import(&mut self, token: &str) -> Result<ImportResult, OperationError<Self::Error>> {
    crate::imports::commit(self, token)
  }
  fn cancel_import(&mut self, token: &str) {
    self.staged_imports.remove(token);
  }
  fn delete_translation(
    &mut self,
    translation_id: &TranslationId,
  ) -> Result<Vec<Translation>, OperationError<Self::Error>> {
    let transaction = self
      .connection
      .transaction_with_behavior(rusqlite::TransactionBehavior::Immediate)
      .map_err(StorageError::Catalog)
      .map_err(OperationError::Storage)?;
    let row: Option<(bool, Option<String>)> = transaction
      .query_row(
        "SELECT bundled,import_id FROM translations WHERE id=?1",
        [&translation_id.0],
        |row| Ok((row.get(0)?, row.get(1)?)),
      )
      .optional()
      .map_err(StorageError::Catalog)
      .map_err(OperationError::Storage)?;
    let Some((bundled, import_id)) = row else {
      return Err(
        ApplicationFailure::TranslationUnavailable {
          message: "The selected translation is unavailable.".into(),
          data: TranslationData {
            translation_id: translation_id.clone(),
          },
        }
        .into(),
      );
    };
    if bundled {
      return Err(
        ApplicationFailure::TranslationProtected {
          message: "Bundled WEB cannot be deleted.".into(),
          data: CatalogFailureData {
            field: "translationId".into(),
            reason: "bundled".into(),
          },
        }
        .into(),
      );
    }
    transaction.execute("UPDATE workspaces SET selected_translation_id=(SELECT id FROM translations WHERE bundled=1 LIMIT 1) WHERE selected_translation_id=?1",[&translation_id.0]).map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    transaction
      .execute("DELETE FROM translations WHERE id=?1", [&translation_id.0])
      .map_err(StorageError::Catalog)
      .map_err(OperationError::Storage)?;
    if let Some(import_id) = import_id {
      transaction.execute("DELETE FROM imports WHERE id=?1 AND NOT EXISTS (SELECT 1 FROM translations WHERE import_id=?1)",[import_id]).map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    }
    transaction
      .execute("UPDATE catalog_meta SET revision=revision+1", [])
      .map_err(StorageError::Catalog)
      .map_err(OperationError::Storage)?;
    let translations = crate::library::read_state(&transaction)
      .map_err(StorageError::Catalog)
      .map_err(OperationError::Storage)?
      .translations;
    transaction.commit().map_err(StorageError::Catalog).map_err(OperationError::Storage)?;
    Ok(translations)
  }
}
