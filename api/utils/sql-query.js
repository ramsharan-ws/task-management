const { DB } = require("../db");

const GetRow = async (table, query = {}, attr = "*") => {
  return new Promise(async (resolve, reject) => {
    try {
      const row = await DB.from(table).select(attr).where(query).first();
      resolve(row);
    } catch (error) {
      reject(error);
    }
  });
};

const GetRows = async (
  table,
  query = {},
  attr = "*",
  limit = 20,
  offset = 0,
  orderby = []
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rows = await DB.from(table)
        .select(attr)
        .where(query)
        .orderBy(orderby)
        .limit(limit)
        .offset(offset);
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
};

const GetRowsWhereIn = async (
  table,
  attr = "*",
  whereInColumn = "",
  whereInArray = [],
  query = {},
  orderby = []
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rows = await DB.from(table)
        .select(attr)
        .whereIn(whereInColumn, whereInArray)
        .where(query)
        .orderBy(orderby);
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
};

const GetRowsWithInAndBetween = async (
  table,
  attr = "*",
  whereInColumn = "",
  whereInArray = [],
  dateColumn = "",
  startDate = "",
  endDate = "",
  query = {},
  orderby = []
) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rows = await DB.from(table)
        .select(attr)
        .whereBetween(dateColumn, [startDate, endDate])
        .whereIn(whereInColumn, whereInArray)
        .where(query)
        .orderBy(orderby);
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
};

const GetRowsMultiWhereIn = async (
  table,
  attr = "*",
  whereInClauses = [],
  query = {},
  orderby = []
) => {
  try {
    // Ensure that table is a valid string
    if (typeof table !== 'string' || table.trim() === '') {
      throw new Error('Invalid table name');
    }

    // Initialize the query builder
    let queryBuilder = DB.from(table).select(attr);

    // Apply whereIn clauses
    whereInClauses.forEach(({ column, values }) => {
      queryBuilder = queryBuilder.whereIn(column, values);
    });

    
    // Apply additional query conditions
    queryBuilder = queryBuilder.where(query);
    
    // Apply orderby
    queryBuilder = queryBuilder.orderBy(orderby);
    
    // Execute the query
    const rows = await queryBuilder;
    
    return rows;
  } catch (error) {
    // Log or handle the error in some way
    console.error(error);
    throw error; // Rethrow the error for the caller to handle
  }
};

const GetRowsMultiWhereInAndBetween = async (
  table,
  attr = "*",
  whereInClauses = [],
  betweenClauses = [],
  query = {},
  orderby = []
) => {
  try {
    // Ensure that table is a valid string
    if (typeof table !== 'string' || table.trim() === '') {
      throw new Error('Invalid table name');
    }

    // Initialize the query builder
    let queryBuilder = DB.from(table).select(attr);

    // Apply Between clauses
    betweenClauses.forEach(({ column, values }) => {
      queryBuilder = queryBuilder.whereBetween(column, values);
    });

    // Apply whereIn clauses
    whereInClauses.forEach(({ column, values }) => {
      queryBuilder = queryBuilder.whereIn(column, values);
    });


    // Apply additional query conditions
    queryBuilder = queryBuilder.where(query);

    // Apply orderby
    queryBuilder = queryBuilder.orderBy(orderby);

    // Execute the query
    const rows = await queryBuilder;

    return rows;
  } catch (error) {
    // Log or handle the error in some way
    console.error(error);
    throw error; // Rethrow the error for the caller to handle
  }
};



const GetAllRows = async (table, query = {}, attr = "*", orderby = []) => {
  return new Promise(async (resolve, reject) => {
    try {
      const rows = await DB.from(table)
        .select(attr)
        .where(query)
        .orderBy(orderby);
      resolve(rows);
    } catch (error) {
      reject(error);
    }
  });
};

const InsertRow = async (table, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).insert(params);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const UpdateRow = async (table, where, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).where(where).update(params);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};
const UpdateRowsWhereIn = async (table, columnName, values, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).whereIn(columnName, values).update(params);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const DeleteRow = async (table, where) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).where(where).del();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const InsertRows = async (table, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB.batchInsert(table, params);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const InsertUpdateRowsMaster = async (table, data, uniqueKey) => {
  // const uniqueKey="pcm_part_number";

  const existingRecords = await DB.select(uniqueKey)
    .from(table)
    .whereIn(
      uniqueKey,
      data.map((row) => row[uniqueKey])
    );

  const updates = [];
  const inserts = [];

  data.forEach((row) => {
    const existingRecord = existingRecords.find(
      (record) => record[uniqueKey] === row[uniqueKey]
    );
    if (existingRecord) {
      updates.push(DB(table).where(uniqueKey, row[uniqueKey]).update(row));
    } else {
      inserts.push(row);
    }
  });

  try {
    if (updates.length > 0) {
      await Promise.all(updates);
    }
    if (inserts.length > 0) {
      await DB.batchInsert(table, inserts);
    }
  } catch (error) {
    throw error;
  }
};

const KnexBatchUpdate = async (options, collection) => {
  return new Promise(async (resolve, reject) => {
    const { table, column } = options;
    const trx = await DB.transaction();
    try {
      const ids = await Promise.all(
        collection.map((tuple) =>
          DB(table).where(column, tuple[column]).update(tuple).transacting(trx)
        )
      );
      await trx.commit();
      resolve(ids);
    } catch (error) {
      await trx.rollback();
      reject(error);
    }
  });
};

const KnexBatchUpsert = async (table, data, uniqueKey) => {
  return new Promise(async (resolve, reject) => {
    try {
      const updated_ids = await KnexBatchUpdate(
        {
          table: table,
          column: uniqueKey,
        },
        data
      );
      const result = await DB.raw([DB(table).insert(data)]);
      resolve({
        rows_inserted: result["rowCount"],
        rows_updated: updated_ids.length,
      });
    } catch (error) {
      reject(error);
    }
  });
};

const KnexBatchInsert = async (table, data) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).insert(data);
      resolve({
        rows_inserted: result["rowCount"],
      });
    } catch (error) {
      reject(error);
    }
  });
};

const RunQuery = async (statement, params) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB.raw(statement, params);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const KnexBatchUpdateAll = async (options, collection) => {
  return new Promise(async (resolve, reject) => {
    const { table, column } = options;
    const trx = await DB.transaction();
    try {
      const ids = await Promise.all(
        collection.map((tuple) =>
          DB(table).where(column, tuple[column]).update(tuple).transacting(trx)
        )
      );
      await trx.commit();
      resolve(ids);
    } catch (error) {
      await trx.rollback();
      reject(error);
    }
  });
};

const DeleteRows = async (table, query) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).where(query).del();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

const DeleteRowsWhereIn = async (table, columnName, values) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await DB(table).whereIn(columnName, values).del();
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = {
  GetRow,
  GetRows,
  GetAllRows,
  InsertRow,
  RunQuery,
  UpdateRow,
  DeleteRow,
  DeleteRows,
  InsertRows,
  InsertUpdateRowsMaster,
  KnexBatchUpsert,
  KnexBatchInsert,
  KnexBatchUpdateAll,
  GetRowsWhereIn,
  GetRowsMultiWhereIn,
  GetRowsWithInAndBetween,
  GetRowsMultiWhereInAndBetween,
  DeleteRowsWhereIn,
  UpdateRowsWhereIn
};
