const { v4: uuidv4 } = require("uuid");
const ExcelJS = require('exceljs');
const {
  GetRow,
  InsertRow,
  RunQuery,
  UpdateRow,
  GetAllRows,
  KnexBatchInsert,
} = require("../utils/sql-query");
const { TasksArrayUploadSchema } = require("../validators/tasks");

const TABLE_NAME = "tasks";

const GetTasks = async () => {
  return new Promise(async (resolve) => {
    const query = `
      SELECT 
        *
      FROM 
        tasks
      ORDER BY 
        updated_at DESC;`;
    const result = await RunQuery(query);
    resolve(result.rows);
  });
};

const GetTask = async (params) => {
  return new Promise(async (resolve) => {
    const task_query_params = { uuid: params['uuid'] };
    console.log("task_query_params", task_query_params);
    const task_query = "SELECT * FROM tasks WHERE uuid =:uuid LIMIT 1";
    const result = await RunQuery(task_query, task_query_params);
    if(result.rows.length > 0){
      resolve(result.rows[0]);
    }else{
      resolve(null);
    }
  });
};

const CreateTask = async (params, attr = "*") => {
  return new Promise(async (resolve) => {
    const uuid = uuidv4();
    params['uuid'] = uuid;
    const task = await InsertRow(TABLE_NAME, params);
    const response = {
      rows_inserted: task['rowCount'],
      uuid:uuid
    }
    resolve(response);
  });
};

const UpdateTask = async (conditions, params) => {
  return new Promise(async (resolve) => {
    const task = await UpdateRow(TABLE_NAME, conditions, params);
    const response = {  
      rows_updated: task['rowCount'],
      uuid:conditions['uuid']
    };
    resolve(response);
  });
};

const UpdateTaskStatus = async (params) => {
  return new Promise(async (resolve) => {
    const query = "UPDATE tasks SET status=:status, updated_by=:updated_by, updated_at=:updated_at WHERE uuid=:uuid";
    const result = await RunQuery(query, params);
    const response = {  
      rows_updated: result['rowCount'],
      uuid:params['uuid']
    };
    resolve(response);
  });
};

const UpdateTaskPriority = async (params) => {
  return new Promise(async (resolve) => {
    const query = "UPDATE tasks SET priority=:priority, updated_by=:updated_by, updated_at=:updated_at WHERE uuid=:uuid";
    const result = await RunQuery(query, params);
    const response = {  
      rows_updated: result['rowCount'],
      uuid:params['uuid']
    };
    resolve(response);
  });
};

function trimObjectValues(obj) {
  const trimmedObj = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      if(typeof obj[key] === 'string'){
        trimmedObj[key] = obj[key].trim();
      }else {
        trimmedObj[key] = obj[key];
      }
    }
  }
  return trimmedObj;
}

function replaceKeysInArrayOfObjects(array) {
  const key_mapping = {
    "Title": "title",
    "Description": "description",
    "DueDate": "due_date",
    "Status": "status",
    "Priority": "priority",
    "UUID": "uuid",
    "CREATED_BY": "created_by",
    "UPDATED_BY": "updated_by",
    "CREATED_AT": "created_at",
    "UPDATED_AT": "updated_at"
  };
  return array.map((obj) => {
    const updatedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = key_mapping[key] || key;
        updatedObj[newKey] = obj[key];
      }
    }
    return updatedObj;
  });
}


const UploadTasks = async (params) => {
  return new Promise(async (resolve, reject) => {
    try {
    const expectedHeaders = ['Title', 'Description', 'DueDate', 'Status', 'Priority'];
    const filteredHeaders = expectedHeaders.filter(header => header.trim() !== '');
    const workbook = new ExcelJS.Workbook();
      // Load the workbook from the buffer
      workbook.xlsx.load(params['file_buffer'])
      .then(async () => {
        console.log("workbook", workbook);
        // Assume there is only one sheet, you may need to adjust this based on your file
        const sheet = workbook.getWorksheet(1);
        // Check if the headers match the expected headers
        const actualHeaders = sheet.getRow(1).values;
        const filteredActualHeaders = actualHeaders.filter(header => header.trim() !== '');

        if (!arrayEquals(filteredActualHeaders, filteredHeaders)) {
          throw new Error('Headers do not match the expected headers');
        }

        const jsonData = [];

        sheet.eachRow({ includeEmpty: true, skip: 1 }, function (row, rowNumber) {
          const rowData = {};
          row.eachCell({ includeEmpty: true }, function (cell, colNumber) {
            const header = filteredActualHeaders[colNumber - 1];
            rowData[header] = cell.value;
          });
          jsonData.push(rowData);
        });
        
        // Print the parsed JSON data
        const trimmed_data = jsonData.map(trimObjectValues);

        trimmed_data.shift();

        // Validation Part Starts
        const tasks_array_schema = await TasksArrayUploadSchema();
        const tasks_validation = tasks_array_schema.validate(
          trimmed_data
        );

        if (tasks_validation.error) {
          reject(tasks_validation.error.details);
          return;
        }

          const new_latest_trimmed_data_with_key_mapping = trimmed_data.map(item => {
            return {
              ...item,
              UUID: uuidv4(),
              CREATED_BY: params['user_id'],
              UPDATED_BY: params['user_id'],
              CREATED_AT: "NOW()",
              UPDATED_AT: "NOW()"
            };
          });


          console.log("new_latest_trimmed_data_with_key_mapping", new_latest_trimmed_data_with_key_mapping);

            const trimmed_data_with_key_mapping = replaceKeysInArrayOfObjects(
              new_latest_trimmed_data_with_key_mapping
            );

            const latest_trimmed_data_with_key_mapping = trimmed_data_with_key_mapping.map(item => {
              const { ...rest } = item;
              return rest;
            });

            latest_trimmed_data_with_key_mapping.shift();

            const upload_result = await Upload(latest_trimmed_data_with_key_mapping);
            resolve({
              success:true,
              data:latest_trimmed_data_with_key_mapping,
              rows_inserted:upload_result.rows_inserted,
            });
            return;
      })
      .catch(error => {
        console.log(error);
        reject(error);
        return;
      });
    } catch (error) {
      console.log(error);
      reject(error);
      return;
    } 
  });
};

function arrayEquals(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

const Upload = async (tasks) => {
  return new Promise(async (resolve, reject) => {
    try {
      const result = await KnexBatchInsert("tasks", tasks);
      resolve(result);
      return;
    } catch (error) {
      reject(error);
      return;
    }
  });
};

module.exports = {
  GetTasks,
  GetTask,
  CreateTask,
  UpdateTask,
  UpdateTaskStatus,
  UpdateTaskPriority,
  UploadTasks
};
