import { ClientOptions } from "openai";
import { TaskRunner } from "./TaskRunner";

interface SetupConfig {
  client_options?: ClientOptions;
  default_model_name?: string;
}

/**
 * 配置环境 比如调用接口、api key之类的
 */
export function setup(config: SetupConfig = {}) {
  TaskRunner.client_options =
    config.client_options ?? TaskRunner.client_options;
  TaskRunner.default_model_name =
    config.default_model_name ?? TaskRunner.default_model_name;
}
