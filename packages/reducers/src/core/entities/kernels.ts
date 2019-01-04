import { combineReducers } from "redux-immutable";
import { Action } from "redux";
import * as Immutable from "immutable";

import {
  makeKernelNotStartedRecord,
  makeLocalKernelRecord,
  makeRemoteKernelRecord,
  makeKernelsRecord,
  KernelsRecordProps,
  KernelRecord
} from "@nteract/types";
import {
  makeKernelInfoRecord,
  makeHelpLinkRecord,
  HelpLink
} from "@nteract/types";
import * as actionTypes from "@nteract/actions";
import { JSONObject } from "@nteract/commutable/src";

// TODO: we need to clean up references to old kernels at some point. Listening
// for KILL_KERNEL_SUCCESSFUL seems like a good candidate, but I think you can
// also end up with a dead kernel if that fails and you hit KILL_KERNEL_FAILED.
const byRef = (
  state = Immutable.Map<string, KernelRecord>(),
  action: Action
) => {
  let typedAction;
  switch (action.type) {
    case actionTypes.SET_LANGUAGE_INFO:
      // TODO: Should the kernel hold language info?
      return state;
    case actionTypes.KILL_KERNEL_SUCCESSFUL:
      typedAction = action as actionTypes.KillKernelSuccessful;
      return state.setIn([typedAction.payload.kernelRef, "status"], "killed");
    case actionTypes.KILL_KERNEL_FAILED:
      typedAction = action as actionTypes.KillKernelFailed;
      return state.setIn(
        [typedAction.payload.kernelRef, "status"],
        "failed to kill"
      );
    case actionTypes.RESTART_KERNEL:
      typedAction = action as actionTypes.RestartKernel;
      return state.setIn(
        [typedAction.payload.kernelRef, "status"],
        "restarting"
      );
    case actionTypes.LAUNCH_KERNEL:
      typedAction = action as actionTypes.LaunchKernelAction;
      return state.set(
        typedAction.payload.kernelRef,
        makeKernelNotStartedRecord({
          status: "launching",
          kernelSpecName: typedAction.payload.kernelSpec.name
        })
      );
    case actionTypes.LAUNCH_KERNEL_BY_NAME:
      typedAction = action as actionTypes.LaunchKernelByNameAction;
      return state.set(
        typedAction.payload.kernelRef,
        makeKernelNotStartedRecord({
          status: "launching",
          kernelSpecName: typedAction.payload.kernelSpecName
        })
      );
    case actionTypes.CHANGE_KERNEL_BY_NAME:
      typedAction = action as actionTypes.ChangeKernelByName;
      return state.setIn(
        [typedAction.payload.oldKernelRef, "status"],
        "changing"
      );
    case actionTypes.SET_KERNEL_INFO:
      typedAction = action as actionTypes.SetKernelInfo;
      let codemirrorMode = typedAction.payload.info.codemirrorMode;
      // If the codemirror mode isn't set, fallback on the language name
      if (!codemirrorMode) {
        codemirrorMode = typedAction.payload.info.languageName;
      }
      switch (typeof codemirrorMode) {
        case "string":
          // already set as we want it
          break;
        case "object":
          codemirrorMode = Immutable.Map(codemirrorMode as JSONObject);
          break;
        default:
          // any other case results in falling back to language name
          codemirrorMode = typedAction.payload.info.languageName;
      }

      const helpLinks = typedAction.payload.info.helpLinks
        ? Immutable.List(
            (typedAction.payload.info.helpLinks as Array<HelpLink>).map(
              makeHelpLinkRecord
            )
          )
        : Immutable.List();

      return state.setIn(
        [typedAction.payload.kernelRef, "info"],
        makeKernelInfoRecord(typedAction.payload.info).merge({
          helpLinks,
          codemirrorMode
        })
      );
    case actionTypes.SET_EXECUTION_STATE:
      typedAction = action as actionTypes.SetExecutionStateAction;
      return state.setIn(
        [typedAction.payload.kernelRef, "status"],
        typedAction.payload.kernelStatus
      );
    case actionTypes.LAUNCH_KERNEL_SUCCESSFUL:
      typedAction = action as actionTypes.NewKernelAction;
      switch (typedAction.payload.kernel.type) {
        case "zeromq":
          return state.set(
            typedAction.payload.kernelRef,
            makeLocalKernelRecord(typedAction.payload.kernel)
          );
        case "websocket":
          return state.set(
            typedAction.payload.kernelRef,
            makeRemoteKernelRecord(typedAction.payload.kernel)
          );
        default:
          throw new Error(
            `Unrecognized kernel type in kernel ${typedAction.payload.kernel}.`
          );
      }
    default:
      return state;
  }
};

export const kernels = combineReducers<KernelsRecordProps, Action, string>(
  { byRef },
  makeKernelsRecord as any
);
