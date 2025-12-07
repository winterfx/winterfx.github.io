---
title: A tiny project based on TUI and AI
pubDate: 2024-08-09
categories: [AI]
description: Building a TUI tool to analyze GitHub trending projects using AI
---

## Background

1. I have a habit to read github tredning every day, and try to find some project i interested in.But i can't get enough information from the trending portal.So I must click the project and navigate to the github page read the README.md to get more information.However,the README.md is not always well written.My needing is simple not technical, just want to know why the project can be popular.Mapping to technical, `I want to know the project's lightspot, the problems it resloved and how it achive`.
2. `Train myself to using AI with program to solve plorblem.`
3. Not familiat with frontend,and want to try to use `TUI` to build a project.TUI looks like more hacker style.

## TUI Study

### bubbletea

[bubbletea link](https://github.com/charmbracelet/bubbletea)

A simple and easy to use TUI library for Go, inspired by The `Elm Architecture`.
[The Elm Architecture](https://guide.elm-lang.org/architecture/)

## Design

![flow](/flow.png)

### Cmd

go `flag` package to parse the command line arguments.

- mode : "debug",means enable log some information to gitoday.log
- preview: "true",means enable preview some page without fake data.
- apiKey: "xxxx",required, the ai api key.

### UI

1. language model: choose the code language page
2. project model: show the project list and detail page

### Service

1.  Crawler

    using third party pkg:`goquery` [git link](https://github.com/PuerkitoBio/goquery)

2.  AI

        just use `net/http` to send the request to the AI server.

        prompt as below:
        ```shell
        你是一个GitHub代码分析师，请根据我给你的URL:%s分析出这个项目的信息。并按以下结构返回给我：
        {
            "what":"",//这个项目是什么，请简要地尽量一句话概括它的功能。
            "why":["",""],//这个项目解决了哪些痛点,出于什么样的目的，请按数组的方式专业条理地列出。这一项突出解决了什么问题。
            "how":["",""],//这个项目是如何实现的，请列出它的使用的关键技术，请按数组的方式列出，这一项是突出技术。如果找不到细节，就请给出这种项目的通用设计。
            "other":["",""]//忽律这个项目的地址，找一些与这个项目相似的项目，知名度要高一些，列举几个他们的名字，按数组的方式列出。
        }
        example:
        {
            "what":"Immich-Go is an open-source tool designed to streamline uploading large photo collections to your self-hosted Immich server. It is an alternative to the immich-CLI command that doesn't depend on NodeJS installation.",
            "why":["It solves the problem of handling massive archives downloaded from Google Photos using Google Takeout while preserving valuable metadata.",
            "It offers a simpler installation process than other tools, as it doesn't require NodeJS or Docker for installation.",
            "It discards any lower-resolution versions that might be included in Google Photos Takeout, ensuring the best possible copies on your Immich server."],
            "how":["Immich-Go uses the Immich API to interact with the Immich server.",
            "It supports uploading photos directly from your computer folders, folders tree and ZIP archives.",
            "It provides several options to manage photos, such as grouping related photos, controlling the creation of Google Photos albums in Immich, and specifying inclusion or exclusion of partner-taken photos."],
            "other":["rclone","gphotos-uploader-cli","gphotos-sync"]
        ],
        当你写完之后，请再检查一下，确保你的回答是没有过多重复的内容和格式是否正确，请确保是json结构，请重新回答。
        ```

    _I use dify to build my ai server,my dify app integrate azure openai and webcrawler tool.I pass the repo url to ai server,webcrawler will fetch the README.md and other information from the repo,then ai server will analyze the information and return the result to me._

## Limitation

1. webcrawler can't fetch more information from the repo,just fetch the First page of repo.
