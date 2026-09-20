import type { MockMethod } from "vite-plugin-mock";

import testModule from "./test/index";
import userModule from "./user/index";
import systemModule from "./system/index";
import fileModule from "./file/index";
import tableModule from "./table/index";
import monitorModule from "./monitor/index";

// vite-plugin-mock 3.x 已移除生产期 mock（createProdMockServer），此处聚合导出开发期 mock 列表
export default [...testModule, ...userModule, ...systemModule, ...fileModule, ...tableModule, ...monitorModule] as MockMethod[];
