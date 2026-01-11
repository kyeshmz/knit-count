import SwiftUI
import WidgetKit
import AppIntents
import Foundation

#if canImport(ActivityKit)
import ActivityKit
#endif

// MARK: - Shared Counter State

/// Shared counter state that can be accessed by both the main app and Live Activity widget
struct SharedCounterState: Codable {
    var section1Rows: [Bool]
    var section1Iteration: Int
    var section2Rows: [Bool]
    var section2Iteration: Int
    var currentSection: Int
    var totalCount: Int
    var cycleCount: Int
    var targetCount: Int
    var projectName: String

    static let defaultState = SharedCounterState(
        section1Rows: [false, false],
        section1Iteration: 1,
        section2Rows: [false, false, false, false],
        section2Iteration: 0,
        currentSection: 1,
        totalCount: 0,
        cycleCount: 1,
        targetCount: 45,
        projectName: "Project"
    )
}

/// Manager for reading/writing shared counter state via App Groups
class SharedStateManager {
    static let shared = SharedStateManager()

    private let appGroupIdentifier = "{{APP_GROUP}}"
    private let stateKey = "counterState"

    private var userDefaults: UserDefaults? {
        UserDefaults(suiteName: appGroupIdentifier)
    }

    private init() {}

    /// Get the current counter state
    func getState() -> SharedCounterState {
        guard let userDefaults = userDefaults,
              let data = userDefaults.data(forKey: stateKey),
              let state = try? JSONDecoder().decode(SharedCounterState.self, from: data) else {
            return .defaultState
        }
        return state
    }

    /// Save the counter state
    func setState(_ state: SharedCounterState) {
        guard let userDefaults = userDefaults,
              let data = try? JSONEncoder().encode(state) else {
            return
        }
        userDefaults.set(data, forKey: stateKey)
        userDefaults.synchronize()
    }

    /// Increment the total count
    func incrementCount() -> SharedCounterState {
        var state = getState()
        if state.totalCount < state.targetCount {
            state.totalCount += 1
        }
        setState(state)
        return state
    }

    /// Decrement the total count
    func decrementCount() -> SharedCounterState {
        var state = getState()
        if state.totalCount > 0 {
            state.totalCount -= 1
        }
        setState(state)
        return state
    }

    /// Check the next available row and return the updated state
    func checkNextRow() -> SharedCounterState {
        var state = getState()

        if state.currentSection == 1 {
            state = checkSection1NextRow(state)
        } else {
            state = checkSection2NextRow(state)
        }

        setState(state)
        return state
    }

    private func checkSection1NextRow(_ state: SharedCounterState) -> SharedCounterState {
        var newState = state

        if !state.section1Rows[0] {
            newState.section1Rows[0] = true
        } else if !state.section1Rows[1] {
            newState.section1Rows[1] = true
            newState.totalCount += 1

            if state.section1Iteration < 3 {
                newState.section1Rows = [false, false]
                newState.section1Iteration += 1
            } else {
                newState.section1Rows = [false, false]
                newState.section1Iteration = 1
                newState.currentSection = 2
            }
        }

        return newState
    }

    private func checkSection2NextRow(_ state: SharedCounterState) -> SharedCounterState {
        var newState = state
        let activeRows = state.section2Iteration == 0 ? [0, 1, 2, 3] : [2, 3]

        for rowIndex in activeRows {
            if !state.section2Rows[rowIndex] {
                newState.section2Rows[rowIndex] = true

                if rowIndex == activeRows.last {
                    newState.totalCount += 1

                    if state.section2Iteration < 2 {
                        newState.section2Rows = [false, false, false, false]
                        newState.section2Iteration += 1
                    } else {
                        newState.section2Rows = [false, false, false, false]
                        newState.section2Iteration = 0
                        newState.currentSection = 1
                        newState.cycleCount += 1
                    }
                }
                break
            }
        }

        return newState
    }

    /// Get display info for current state
    func getDisplayInfo(_ state: SharedCounterState) -> (title: String, subtitle: String, progress: Double) {
        let rowInfo = getCurrentRowInfo(state)
        let title = rowInfo.rowLabel

        let sectionInfo = "Section \(state.currentSection)"
        let repInfo: String
        if state.currentSection == 1 {
            repInfo = "Rep \(state.section1Iteration)/3"
        } else if state.section2Iteration == 0 {
            repInfo = "Rows 1-4"
        } else {
            repInfo = "Rep \(state.section2Iteration)/2 (3-4)"
        }

        let subtitle = "\(sectionInfo) \u{2022} \(repInfo) \u{2022} \(state.totalCount)/\(state.targetCount)"
        let progress = Double(state.totalCount) / Double(state.targetCount)

        return (title, subtitle, progress)
    }

    private func getCurrentRowInfo(_ state: SharedCounterState) -> (section: Int, rowLabel: String, rowNumber: Int) {
        if state.currentSection == 1 {
            if !state.section1Rows[0] {
                return (1, "Row 1", 1)
            } else if !state.section1Rows[1] {
                return (1, "Row 2", 2)
            } else {
                return (1, "Row 2", 2)
            }
        } else {
            let activeRows = state.section2Iteration == 0 ? [0, 1, 2, 3] : [2, 3]
            for rowIndex in activeRows {
                if !state.section2Rows[rowIndex] {
                    return (2, "Row \(rowIndex + 1)", rowIndex + 1)
                }
            }
            let lastRow = activeRows.last ?? 3
            return (2, "Row \(lastRow + 1)", lastRow + 1)
        }
    }
}

// MARK: - App Intents

#if canImport(ActivityKit)

/// Helper function to update all Live Activities
@available(iOS 17.0, *)
func updateAllLiveActivities(with state: SharedCounterState) async {
    let displayInfo = SharedStateManager.shared.getDisplayInfo(state)

    if #available(iOS 16.2, *) {
        let activities = Activity<LiveActivityAttributes>.activities

        for activity in activities {
            let newContentState = LiveActivityAttributes.ContentState(
                title: displayInfo.title,
                subtitle: displayInfo.subtitle,
                timerEndDateInMilliseconds: nil,
                progress: displayInfo.progress,
                imageName: nil,
                dynamicIslandImageName: nil
            )

            await activity.update(
                ActivityContent(
                    state: newContentState,
                    staleDate: nil
                )
            )
        }
    }
}

/// App Intent for checking off the current row from the Live Activity
@available(iOS 17.0, *)
struct CheckRowIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Check Row"
    static var description = IntentDescription("Mark the current row as complete")

    init() {}

    func perform() async throws -> some IntentResult {
        let newState = SharedStateManager.shared.checkNextRow()
        await updateAllLiveActivities(with: newState)
        return .result()
    }
}

/// App Intent for incrementing the count
@available(iOS 17.0, *)
struct IncrementCountIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Increment Count"
    static var description = IntentDescription("Add one to the count")

    init() {}

    func perform() async throws -> some IntentResult {
        let newState = SharedStateManager.shared.incrementCount()
        await updateAllLiveActivities(with: newState)
        return .result()
    }
}

/// App Intent for decrementing the count
@available(iOS 17.0, *)
struct DecrementCountIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Decrement Count"
    static var description = IntentDescription("Subtract one from the count")

    init() {}

    func perform() async throws -> some IntentResult {
        let newState = SharedStateManager.shared.decrementCount()
        await updateAllLiveActivities(with: newState)
        return .result()
    }
}

#endif

// MARK: - Live Activity View

#if canImport(ActivityKit)

  struct ConditionalForegroundViewModifier: ViewModifier {
    let color: String?

    func body(content: Content) -> some View {
      if let color = color {
        content.foregroundStyle(Color(hex: color))
      } else {
        content
      }
    }
  }

  struct DebugLog: View {
    #if DEBUG
      private let message: String
      init(_ message: String) {
        self.message = message
        print(message)
      }

      var body: some View {
        Text(message)
          .font(.caption2)
          .foregroundStyle(.red)
      }
    #else
      init(_: String) {}
      var body: some View { EmptyView() }
    #endif
  }

  struct LiveActivityView: View {
    let contentState: LiveActivityAttributes.ContentState
    let attributes: LiveActivityAttributes

    var progressViewTint: Color? {
      attributes.progressViewTint.map { Color(hex: $0) }
    }

    var accentColor: Color {
      Color(hex: attributes.titleColor ?? "#7C3AED")
    }

    var body: some View {
      let defaultPadding = 16

      let top = CGFloat(
        attributes.paddingDetails?.top
          ?? attributes.paddingDetails?.vertical
          ?? attributes.padding
          ?? defaultPadding
      )

      let bottom = CGFloat(
        attributes.paddingDetails?.bottom
          ?? attributes.paddingDetails?.vertical
          ?? attributes.padding
          ?? defaultPadding
      )

      let leading = CGFloat(
        attributes.paddingDetails?.left
          ?? attributes.paddingDetails?.horizontal
          ?? attributes.padding
          ?? defaultPadding
      )

      let trailing = CGFloat(
        attributes.paddingDetails?.right
          ?? attributes.paddingDetails?.horizontal
          ?? attributes.padding
          ?? defaultPadding
      )

      VStack(alignment: .leading, spacing: 12) {
        // Top row: Title and subtitle
        HStack(alignment: .center) {
          VStack(alignment: .leading, spacing: 2) {
            Text(contentState.title)
              .font(.headline)
              .fontWeight(.semibold)
              .modifier(ConditionalForegroundViewModifier(color: attributes.titleColor))

            if let subtitle = contentState.subtitle {
              Text(subtitle)
                .font(.caption)
                .modifier(ConditionalForegroundViewModifier(color: attributes.subtitleColor))
            }
          }

          Spacer()

          // Check row button
          if #available(iOS 17.0, *) {
            Button(intent: CheckRowIntent()) {
              Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(accentColor)
            }
            .buttonStyle(.plain)
          }
        }

        // Bottom row: Counter controls and progress
        HStack(alignment: .center, spacing: 12) {
          // Decrement button
          if #available(iOS 17.0, *) {
            Button(intent: DecrementCountIntent()) {
              Image(systemName: "minus.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(accentColor.opacity(0.8))
            }
            .buttonStyle(.plain)
          }

          // Progress bar (takes remaining space)
          if let progress = contentState.progress {
            ProgressView(value: progress)
              .tint(progressViewTint)
              .modifier(ConditionalForegroundViewModifier(color: attributes.progressViewLabelColor))
          } else if let date = contentState.timerEndDateInMilliseconds {
            ProgressView(timerInterval: Date.toTimerInterval(miliseconds: date))
              .tint(progressViewTint)
              .modifier(ConditionalForegroundViewModifier(color: attributes.progressViewLabelColor))
          }

          // Increment button
          if #available(iOS 17.0, *) {
            Button(intent: IncrementCountIntent()) {
              Image(systemName: "plus.circle.fill")
                .font(.system(size: 28))
                .foregroundStyle(accentColor.opacity(0.8))
            }
            .buttonStyle(.plain)
          }
        }
      }
      .padding(EdgeInsets(top: top, leading: leading, bottom: bottom, trailing: trailing))
    }
  }

#endif
