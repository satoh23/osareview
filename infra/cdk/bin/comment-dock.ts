#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CommentDockStack } from "../lib/comment-dock-stack";

const app = new cdk.App();
new CommentDockStack(app, "CommentDockStack", {});
